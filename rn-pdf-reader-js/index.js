// @flow
import React, { Component } from 'react'
import {
	AsyncStorage,
	View,
	ActivityIndicator,
	Platform,
	StyleSheet,
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

async function checkPath() {
	//console.log("Checking and correcting path");
	try {
		const { exists, md5, isDirectory, uri } = await getInfoAsync(storagePath, { md5: true });
		//console.log("Exists: " + exists + " isDirectory: " + isDirectory + " uri: " + uri);
	} catch (e) {
		console.warn("Directory error: " + e);
	}
}

async function writePDFAsync(base64: string) {
	if (base64.startsWith('data:application/pdf;base64,')) {
		console.log("Writing temp PDF to cache");
		await writeAsStringAsync(pdfPath, base64.replace('data:application/pdf;base64,', ''), { encoding: FileSystem.EncodingType.Base64 });
		const { exists: pdfPathExist, size: fileSize, md5 } = await getInfoAsync(pdfPath, {size: true, md5: true});
		if (pdfPathExist && fileSize > 1000) {
			console.log("Wrote PDF successfully to " + pdfPath + " with size of " + fileSize + " and a hash of " + md5);
		} else {
			console.warn("PDF not written successfully! Exists: " + pdfPathExist + ", Size: " + fileSize);
		}
	} else {
		console.warn("base64 passed to writePDFAsync is malformed! Input: " + base64.substring(0,100) + "...");
	}
}

async function writeWebViewReaderFileAsync(data: string, magazineName: string): Promise < * > {
	const { exist, md5 } = await getInfoAsync(bundleJsPath, { md5: true })
	const bundleContainer = require('./bundleContainer')
	if (!exist || bundleContainer.getBundleMd5() !== md5) {
		await writeAsStringAsync(bundleJsPath, bundleContainer.getBundle())
	}
	await writeAsStringAsync(htmlPath, viewerHtml(data))
	await storePermanent(data, magazineName)
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
	let options = { encoding: FileSystem.EncodingType.Base64 };
	//let options = { encoding: FileSystem.EncodingType.UTF8 };
	
	magazineName = magazineName.replace(/ /g, "_");
	console.log("base64 to be stored: " + data.substring(0,100) + "...");
	
	try {
		if (Platform.OS !== 'ios') {
			console.log("Storing '" + magazineName.replace(" ", "_") + "' at " + (storagePath + magazineName + ".html") + " for Android");
			await writeAsStringAsync((storagePath + magazineName + ".html"), data, options);
		} else {
			console.log("Storing '" + magazineName + "' at " + (storagePath + magazineName + ".pdf") + " for iOS");
			await writeAsStringAsync((storagePath + magazineName + ".pdf"), data, options);
		}
		return true;
	} catch (e) {
		console.warn("Article storage " + e);
	}
}

export async function readPermanent(magazineName: string): Promise < * > {
	let options = { encoding: FileSystem.EncodingType.Base64 };
	//let options = { encoding: FileSystem.EncodingType.UTF8 };
	magazineName = magazineName.replace(/ /g, "_");
	try {
		if (Platform.OS !== 'ios') {
			console.log("Reading '" + magazineName + "' at " + (storagePath + magazineName + ".html") + " for Android");
			return await readAsStringAsync((storagePath + magazineName + ".html"), options);
		} else {
			console.log("Reading '" + magazineName + "' at " + (storagePath + magazineName + ".pdf") + " for iOS");
			return await readAsStringAsync((storagePath + magazineName + ".pdf"), options);
		}
	} catch (e) {
		console.warn("Couldn't find article: " + e);
	}
	return false;
}

function readAsTextAsync(mediaBlob: Blob, magazineName: string): Promise < string > {
	return new Promise((resolve, reject) => {
		try {
			const reader = new FileReader()
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
					return resolve(reader.result)
				}
				return reject(
					`Unable to get result of file due to bad type, waiting string and getting ${typeof reader.result}.`,
				)
			}
			reader.onerror = e => {
				console.warn("File reader error: " + e);
			}
			reader.readAsDataURL(mediaBlob)
		} catch (error) {
			reject(error)
		}
	})
}

async function fetchPdfAsync(url: string, currentMagName: string, isAndroid: boolean): Promise < string > {
	console.log('Getting blob for ' + url);
	const mediaBlob = await urlToBlob(url);
	console.log('Calling readAsTextAsync with ' + JSON.stringify(mediaBlob).substring(0,50) + ' and ' + currentMagName);
	return readAsTextAsync(mediaBlob, currentMagName)
}

async function urlToBlob(url) {
	return new Promise((resolve, reject) => {
		var xhr = new XMLHttpRequest()
		xhr.onerror = reject
		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				resolve(xhr.response)
			}
		}
		xhr.open('GET', url)
		xhr.responseType = 'blob'
		xhr.send()
	})
}

const Loader = () => (
	<View style={{ flex: 1, justifyContent: 'center' }}>
    <ActivityIndicator size="large" />
  </View>
)

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

class PdfReader extends Component < Props, State > {
	state = { ready: false, android: false, ios: false, data: undefined, renderedOnce: false }

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
				data = await fetchPdfAsync(source.uri, magName.name, true)
				console.log("data prop created for Android using downloaded data: " + data.substring(0,200));
				ready = !!data
			} else if (ios && source.base64) {
				//await writePDFAsync(source.base64);
				data = (storagePath + magName.name.replace(/ /g, "_") + ".pdf");
				console.log("data prop created for iOS using cached data: " + data);
				ready = true;
			} else if (source.base64 && source.base64.startsWith('data')) {
				console.log("data prop created for Android using cached data: " + source.base64.substring(0,100) + "...");
				data = source.base64
				ready = true
			} else if (ios) {
				console.log("Downloading " + magName.name + " from internet for iOS");
				await writePDFAsync(await fetchPdfAsync(source.uri, magName.name, false));
				data = pdfPath;
				console.log("data prop created for iOS using downloaded data at: " + data);
				ready = true;
				//data = source.uri
			} else {
				console.error('Source prop is malformed! ' + source)
				return
			}

			if (android) {
				await writeWebViewReaderFileAsync(data, magName.name)
			}

			if (onLoad && ready === true) {
				onLoad();
			}

			this.setState({ ready, data })
			this.setState({ renderedOnce: true })
		} catch (error) {
			alert('Sorry, an error occurred.')
			console.error(error)
			console.log("Error: " + error)
		}
	}

	componentDidMount() {
		console.log("Created PdfReader instance");
		//checkPath();
		this.init()
	}

	componentWillUnmount() {
		removeFilesAsync()
	}

	render() {
		const { ready, data, ios, android, renderedOnce } = this.state
		const { style } = this.props

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
