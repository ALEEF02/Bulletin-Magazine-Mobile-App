// @flow
import React, { Component } from 'react'
import {
	View,
	ActivityIndicator,
	Platform,
	StyleSheet,
	ProgressViewIOS,
	ProgressBarAndroid,
	Text,
} from 'react-native'
import { WebView } from "react-native-webview";
import * as FileSystem from 'expo-file-system'
import Constants from 'expo-constants'

const {
	cacheDirectory,
	documentDirectory,
	writeAsStringAsync,
	readAsStringAsync,
	readDirectoryAsync,
	makeDirectoryAsync,
	deleteAsync,
	getInfoAsync,
} = FileSystem

function viewerHtml(base64: string, customStyle?: CustomStyle, withScroll: boolean = false): string {
	console.log("base64 passed to viewerHtml: " + base64.substring(0,100) + "...");
	return `
<!DOCTYPE html>
<html>
  <head>
    <title>PDF reader</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <script type="application/javascript">
      try {
        window.CUSTOM_STYLE = JSON.parse('${JSON.stringify(
          customStyle ?? {},
        )}');
      } catch (error) {
        window.CUSTOM_STYLE = {}
      }
      try {
        window.WITH_SCROLL = JSON.parse('${JSON.stringify(withScroll)}');
      } catch (error) {
        window.WITH_SCROLL = {}
      }
    </script>
  </head>
  <body>
     <div id="file" data-file="${base64}"></div>
     <div id="react-container"></div>
     <script type="text/javascript" src="bundle.js"></script>
   </body>
</html>
`
}
const bundleJsPath = `${cacheDirectory}bundle.js`
var storagePath = FileSystem.documentDirectory;
const htmlPath = `${cacheDirectory}index.html`;
const pdfPath = `${cacheDirectory}file.pdf`;

async function writePDFAsync(base64: string) {
	if (base64 != null && base64.startsWith('data:application/pdf;base64,')) {
		console.log("Writing temp PDF to cache");
		await writeAsStringAsync(pdfPath, base64.replace('data:application/pdf;base64,', ''), { encoding: FileSystem.EncodingType.Base64 });
		//[Violation] 'message' handler took xxxms
		//Crashes app shortly after
		//Only occurs on the larger 2 PDFs
		//Most likely caused by simultaneous writes to permanent and cache storage
		
		console.log("Attempted to write PDF. Checking validity...");
		const { exists: pdfPathExist, size: fileSize, md5 } = await getInfoAsync(pdfPath, {size: true, md5: true});
		if (pdfPathExist && fileSize > 1000) {
			console.log("Wrote PDF successfully to " + pdfPath + " with size of " + fileSize + " and a hash of " + md5);
			return true;
		} else {
			console.warn("PDF not written successfully! Exists: " + pdfPathExist + ", Size: " + fileSize);
			return false;
		}
	} else {
		console.warn("base64 passed to writePDFAsync is malformed! Input: " + base64 + "...");
		return false;
	}
}

async function writeWebViewReaderFileAsync(data: string, magazineName: string, firstWrite: boolean): Promise < * > {
	console.log("Writing temp HTML for Android to cache");
	const { exist, md5 } = await getInfoAsync(bundleJsPath, { md5: true })
	const bundleContainer = require('./bundleContainer')
	if (!exist || bundleContainer.getBundleMd5() !== md5) {
		await writeAsStringAsync(bundleJsPath, bundleContainer.getBundle())
	}
	await writeAsStringAsync(htmlPath, viewerHtml(data))
	if (firstWrite) {
		await storePermanent(data, magazineName)
	}
}

export async function removeFilesAsync(): Promise < * > {
	try {
		const { exists: pdfPathExist } = await getInfoAsync(pdfPath)
		if (pdfPathExist) {
			await deleteAsync(pdfPath)
			console.log("Cleared temp PDF");
		}
		
		const { exists: htmlPathExist } = await getInfoAsync(htmlPath)
		if (htmlPathExist) {
			await deleteAsync(htmlPath)
			console.log("Cleared temp HTML");
		}
	} catch (e) {
		console.warn("removeFilesAsync " + e);
	}
}

export async function storePermanent(data:string, magazineName: string): Promise < * > {
	magazineName = magazineName.replace(/ /g, "_");
	console.log("base64 to be stored: " + data.substring(0,100) + "...");
	
	try {
		if (Platform.OS !== 'ios') {
			let options = { encoding: FileSystem.EncodingType.UTF8 };
			console.log("Storing '" + magazineName.replace(" ", "_") + "' at " + (storagePath + magazineName + ".html") + " for Android");
			await writeAsStringAsync((storagePath + magazineName + ".html"), data, options);
		} else {
			let options = { encoding: FileSystem.EncodingType.Base64 };
			console.log("Storing '" + magazineName + "' at " + (storagePath + magazineName + ".pdf") + " for iOS");
			await writeAsStringAsync((storagePath + magazineName + ".pdf"), data, options);
		}
		return true;
	} catch (e) {
		console.warn("Article storage " + e);
	}
}

export async function readPermanent(magazineName: string): Promise < * > {	
	magazineName = magazineName.replace(/ /g, "_");
	try {
		if (Platform.OS !== 'ios') {
			let options = { encoding: FileSystem.EncodingType.UTF8 };
			console.log("Reading '" + magazineName + "' at " + (storagePath + magazineName + ".html") + " for Android");
			return await readAsStringAsync((storagePath + magazineName + ".html"), options);
		} else {
			let options = { encoding: FileSystem.EncodingType.Base64 };
			console.log("Reading '" + magazineName + "' at " + (storagePath + magazineName + ".pdf") + " for iOS");
			return await readAsStringAsync((storagePath + magazineName + ".pdf"), options);
		}
	} catch (e) {
		console.log("Couldn't find article: " + e);
	}
	return false;
}

var reader = new FileReader()
async function readAsTextAsync(mediaBlob: Blob, magazineName: string) {
	return new Promise((resolve, reject) => {
		reader.onloadend = e => {
			if (typeof reader.result === 'string') {
				try {
					var trunk = reader.result.replace("data:application/pdf;base64,", "");
					trunk = trunk.replace("data:application/octet-stream;base64,", "");
					console.log("Storing article '" + magazineName + "' - " + trunk.substring(0,100) + "...");
					storePermanent(trunk, magazineName).then((value) => {
						if (value != undefined) {
							console.log("Successfully stored article to the filesystem: " + value);
						} else {
							console.warn("storePermanent returned undefined!");
						}
					});
				} catch (error) {
					console.warn("Error saving article: " + error);
				}
				resolve(reader.result)
			}
			return reject(
				`Unable to get result of file due to bad type, waiting string and getting ${typeof reader.result}.`,
			)
		}
		reader.onerror = e => {
			console.warn("File reader error: " + JSON.stringify(e));
			reject
		}
		reader.onprogress = e => {
			console.warn("File reader prog: " + e);
		}
		reader.readAsDataURL(mediaBlob)
	})
}

async function fetchPdfAsync(url: string, currentMagName: string, isAndroid: boolean): Promise < string > {
	console.log('Getting blob for ' + url);
	const mediaBlob = await urlToBlob(url);
	
	if (JSON.stringify(mediaBlob) != "\"\"") {
		console.log('Calling readAsTextAsync with ' + JSON.stringify(mediaBlob).substring(0,50) + ' and ' + currentMagName);
		const readRt = await readAsTextAsync(mediaBlob, currentMagName);
		return readRt;
	} else {
		console.log("Null mediaBlob return");
		return undefined;
	}
}

var xhr = new XMLHttpRequest()
async function urlToBlob(url) {
	return new Promise((resolve, reject) => {
		xhr.onerror = reject
		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				resolve(xhr.response)
			}
		}
		xhr.open('GET', url)
		xhr.onabort = () => {
			resolve(null);
		}
		xhr.responseType = 'blob'
		xhr.send()
	})
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: Constants.statusBarHeight,
		backgroundColor: '#ecf0f1',
	},
	webview: {
		flex: 1,
		backgroundColor: 'rgb(82, 86, 89)',
	},
})

type Props = {
	source: {
		uri ? : string,
		base64 ? : string
	},
	magName: {
		string ? : string
	},
	style: object
}

type State = {
	ready: boolean,
	android: boolean,
	ios: boolean,
	data ? : string,
}

var downloading = false;
class PdfReader extends Component < Props, State > {
	state = { ready: false, android: false, ios: false, data: undefined, renderedOnce: false, progressValue: 0.0}

	constructor(props) {
		super(props);
		this.updateLoaderReadText = this.updateLoaderReadText.bind(this);
		this.updateLoaderBlob = this.updateLoaderBlob.bind(this);
		this.stopDownload = this.stopDownload.bind(this);
	}

	updateLoaderBlob(e) {
		console.log("loading blob: " + e.loaded);
		this.setState({ progressValue: (e.loaded / (e.total * 3)) })
	}
	
	updateLoaderReadText(e) {
		console.log("loading read: " + e.loaded);
		this.setState({ progressValue: ((e.loaded + e.total) / (e.total * 3)) })
	}
	
	stopDownload() {
		if (downloading === true) {
			console.warn("Stopping article download");
			xhr.abort();
			reader.abort();
		} else {
			console.log("Downloading: " + downloading);
		}
	}

	async init() {
		const { onLoad } = this.props;
		try {
			const { source, magName } = this.props
			const ios = Platform.OS === 'ios'
			const android = Platform.OS === 'android'

			this.setState({ ios, android })
			let ready = false
			let data = undefined
			
			if (
				source.uri &&
				android &&
				(source.uri.startsWith('http') ||
					source.uri.startsWith('file') ||
					source.uri.startsWith('content'))
			) {
				console.log("Downloading " + magName.name + " from internet for Android");
				
				reader = new FileReader()
				xhr = new XMLHttpRequest()
				xhr.addEventListener('progress', this.updateLoaderBlob);
				//reader.addEventListener('progress', this.updateLoaderReadText);
				
				downloading = true;
				data = await fetchPdfAsync(source.uri, magName.name, true)
				downloading = false;
				
				console.log("data prop created for Android using downloaded data: " + data.substring(0,200));
				ready = !!data
			} else if (ios && source.base64) {
				data = (storagePath + magName.name.replace(/ /g, "_") + ".pdf");
				console.log("data prop created for iOS using cached data: " + data);
				ready = true;
			} else if (source.base64 && source.base64.startsWith('data')) {
				console.log("data prop created for Android using cached data: " + source.base64.substring(0,100) + "...");
				data = source.base64
				ready = true
			} else if (ios) {
				console.log("Downloading " + magName.name + " from internet for iOS");
				
				reader = new FileReader()
				xhr = new XMLHttpRequest()
				xhr.addEventListener('progress', this.updateLoaderBlob);
				//reader.addEventListener('progress', this.updateLoaderReadText);
				
				downloading = true;
				var willRender = await writePDFAsync(await fetchPdfAsync(source.uri, magName.name, false));
				downloading = false;
				
				if (willRender != undefined) {
					data = pdfPath;
					console.log("data prop created for iOS using downloaded data at: " + data);
					ready = true;
				} else {
					return;
				}
			} else {
				console.error('Source prop is malformed! ' + JSON.stringify(source))
				return
			}

			if (android && source.uri) {
				await writeWebViewReaderFileAsync(data, magName.name, true)
			} else if (android) {
				await writeWebViewReaderFileAsync(data, magName.name, false)
			}

			if (onLoad && ready === true) {
				onLoad();
			}

			this.setState({ ready, data })
			this.setState({ renderedOnce: true })
		} catch (error) {
			console.warn("PDFReader Error: " + error)
		}
	}

	componentDidMount() {
		console.log("Mounted PdfReader");
		this.init()
	}

	componentWillUnmount() {
		console.log("Unmounting PdfReader");
		removeFilesAsync()
	}

	render() {
		const { ready, data, ios, android, renderedOnce } = this.state
		const { style } = this.props
		const Loader = () => (
			<View style={{ flex: 1, justifyContent: 'center' }}>
				<ActivityIndicator size="large" />
				<Text style = {{fontSize: 20, color: '#000'}}> Progress Value: { parseFloat((this.state.progressValue * 100).toFixed(3))} %</Text>
				{
					( android )
					?
					  ( <ProgressBarAndroid styleAttr = "Horizontal" progress = { this.state.progressValue } indeterminate = { false } /> )
					:
					  ( <ProgressViewIOS progress = { this.state.progressValue } /> )
				}
			</View>
		)

		if (data && ios) {
			console.log("Rendering iOS...\n" + data + "\n" + typeof data);
			return (
				<View style={[styles.container, style]}>
					{!ready && <Loader />}
					<WebView
						onLoad={()=>this.setState({ready: true})}
						onError={(e)=>console.error("WebView" + e)}
						originWhitelist={['http://*', 'https://*', 'file://*', 'data:*']}
						allowingReadAccessToURL={undefined}
						style={styles.webview}
						sharedCookiesEnabled={false}
						startInLoadingState={true}
						allowFileAccessFromFileURLs={true}
						source={{ uri: this.state.data }}
					/>
				</View>
			)
		}

		if (ready && data && android) {
			console.log("Rendering Android...\n" + htmlPath + "\n" + JSON.stringify(styles.container) + "\nRendered Once: " + renderedOnce);
			return (
				<View style={[styles.container, style]}>
					<WebView
						allowFileAccess={true}
						allowContentAccess={true}
						allowFileAccessFromFileURLs={true}
						allowUniversalAccessFromFileURLs={true}
						domStorageEnabled={true}
						androidHardwareAccelerationDisabled={true}
						style={styles.webview}
						source={renderedOnce ? { uri: htmlPath } : undefined}
						originWhitelist={["*"]}
						mixedContentMode="always"
					/>
				</View>
			)
		}

		return !ready && <Loader />
	}
}

export default PdfReader
