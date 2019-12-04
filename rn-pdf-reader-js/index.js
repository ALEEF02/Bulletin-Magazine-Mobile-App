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
	writeAsStringAsync,
	deleteAsync,
	getInfoAsync,
} = FileSystem

function viewerHtml(base64: string): string {
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
const htmlPath = `${cacheDirectory}index.html`

async function writeWebViewReaderFileAsync(data: string): Promise < * > {
	const { exist, md5 } = await getInfoAsync(bundleJsPath, { md5: true })
	const bundleContainer = require('./bundleContainer')
	if (!exist || bundleContainer.getBundleMd5() !== md5) {
		await writeAsStringAsync(bundleJsPath, bundleContainer.getBundle())
	}
	await writeAsStringAsync(htmlPath, viewerHtml(data))
}

export async function removeFilesAsync(): Promise < * > {
	await deleteAsync(htmlPath)
}

storeData = async () => {
	try {
		await AsyncStorage.setItem('@storage_Key', 'stored value')
	} catch (e) {
		// saving error
	}
}

function readAsTextAsync(mediaBlob: Blob, magazineName: string): Promise < string > {
	return new Promise((resolve, reject) => {
		try {
			const reader = new FileReader()
			reader.onloadend = e => {
				if (typeof reader.result === 'string') {
					try {
						//TODO: Store results
						console.log("Storing article '" + magazineName + "' - " + reader.result);
						AsyncStorage.setItem(('@' + magazineName), reader.result).then(() => {});
					} catch (error) {
						console.warn("Error saving article: " + error);
					}
					return resolve(reader.result)
				}
				return reject(
					`Unable to get result of file due to bad type, waiting string and getting ${typeof reader.result}.`,
				)
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
	if (isAndroid == true) {
		console.log('Is an Android device, calling readAsTextAsync with ' + mediaBlob + ' and ' + currentMagName);
		return readAsTextAsync(mediaBlob, currentMagName)
	} else {
		console.log("Is not an Android device, directly storing blob");
		try {
			console.log("Storing article " + currentMagName);
			AsyncStorage.setItem(('@' + currentMagName), mediaBlob).then((error) => {
				console.warn("Error saving article: " + error);
			});
		} catch (error) {
			console.warn("Error saving article: " + error);
		}
	}
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
				data = source.base64
				ready = true
			} else if (ios) {
				console.log("Downloading " + magName.name + " from internet");
				data = await fetchPdfAsync(source.uri, magName.name, false)
				ready = !!data
			} else {
				alert('source props is not correct')
				return
			}

			if (android) {
				await writeWebViewReaderFileAsync(data)
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

		if (data && ios && ready) {
			return (
				<View style={[styles.container, style]}>
					{!ready && <Loader />}
					<WebView
						onLoad={()=>this.setState({ready: true})}
						originWhitelist={['http://*', 'https://*', 'file://*', 'data:*']}
						style={styles.webview}
						source={{ uri: data }}
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
