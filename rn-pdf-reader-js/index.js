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

function viewerHtml(base64: string): string {
	console.log("base64 passed to viewerHtml: " + base64.substring(0,30));
	return `
 <!DOCTYPE html>
 <html>
   <head>
     <title>PDF reader</title>
     <meta charset="utf-8" />
     <meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
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
const htmlPath = `${cacheDirectory}index.html`

async function checkPath() {
	console.log("Checking and correcting path");
	try {
		const { exists, md5, isDirectory, uri } = await getInfoAsync(storagePath, { md5: true });
		console.log("Exists: " + exists + " isDirectory: " + isDirectory + " uri: " + uri);
	} catch (e) {
		console.warn("Directory error: " + e);
		await makeDirectoryAsync(storagePath + magazineName);
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
	await deleteAsync(storagePath);
	await deleteAsync(htmlPath);
}

export async function storePermanent(data:string, magazineName: string): Promise < * > {
	let options = { encoding: FileSystem.EncodingType.Base64 };
	
	console.log("Storing '" + magazineName + "' at " + (storagePath + magazineName + ".html"));
	console.log("base64: " + data.substring(0,100) + "...");
	
	try {
		await writeAsStringAsync((storagePath + magazineName + ".html"), data, options);
	} catch (e) {
		console.warn("Article storage " + e);
	}
}

export async function readPermanent(magazineName: string): Promise < * > {
	let options = { encoding: FileSystem.EncodingType.Base64 };
	
	try {
		console.log("Reading '" + magazineName + "' at " + (storagePath + magazineName + ".html"));
		return await readAsStringAsync((storagePath + magazineName + ".html"), options);
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
						console.log("Storing article '" + magazineName + "' - " + reader.result.substring(0,30) + "...");
						storePermanent(reader.result, magazineName).then((value) => {
							if (value != undefined) {
								console.log("Stored " + value.substring(0,30) + "...");
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
	console.log('Calling readAsTextAsync with ' + mediaBlob + ' and ' + currentMagName);
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
				ready = !!data
			} else if (source.base64 && source.base64.startsWith('data')) {
				console.log("base64: " + source.base64.substring(0,10) + "...");
				data = source.base64
				ready = true
			} else if (ios) {
				console.log("Downloading " + magName.name + " from internet for iOS");
				data = viewerHtml(await fetchPdfAsync(source.uri, magName.name, false));
				console.log("Moving to begin rendering article. data: " + data.substring(0,50));
				//console.log("hi");
				//data = source.uri
			} else {
				console.error('source props is not correct')
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
		checkPath();
		this.init()
	}

	componentWillUnmount() {
		if (this.state.android) {
			removeFilesAsync()
		}
	}

	render() {
		const { ready, data, ios, android, renderedOnce } = this.state
		const { style } = this.props

		if (data && ios) {
			console.log("Rendering iOS...\n" + data.substring(0,20) + "\nURL: " + (storagePath + this.props.magName.name + ".html"));
			return (
				<View style={[styles.container, style]}>
					{!ready && <Loader />}
					<WebView
						onLoad={()=>this.setState({ready: true})}
						originWhitelist={['http://*', 'https://*', 'file://*', 'data:*', "*"]}
						allowingReadAccessToURL={true}
						style={styles.webview}
						allowFileAccess={true}
						allowContentAccess={true}
						allowFileAccessFromFileURLs={true}
						allowUniversalAccessFromFileURLs={true}
						domStorageEnabled={true}
						mixedContentMode="always"
						source={{ uri: (storagePath + this.props.magName.name + ".html") }}
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

		return <Loader />
	}
}

export default PdfReader
