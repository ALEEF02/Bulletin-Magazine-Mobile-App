// @flow
import React, { Component } from 'react'
import {
  View,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native'
import { WebView } from 'react-native-webview';
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

async function writeWebViewReaderFileAsync(data: string): Promise<*> {
  const { exist, md5 } = await getInfoAsync(bundleJsPath, { md5: true })
  const bundleContainer = require('./bundleContainer')
  if (!exist || bundleContainer.getBundleMd5() !== md5) {
    await writeAsStringAsync(bundleJsPath, bundleContainer.getBundle())
  }
  await writeAsStringAsync(htmlPath, viewerHtml(data))
}

export async function removeFilesAsync(): Promise<*> {
  await deleteAsync(htmlPath)
}

function readAsTextAsync(mediaBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader()
      reader.onloadend = e => {
        if (typeof reader.result === 'string') {
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

async function fetchPdfAsync(url: string): Promise<string> {
  const mediaBlob = await urlToBlob(url)
  return readAsTextAsync(mediaBlob)
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
	opacity: 0.99,
    paddingTop: Constants.statusBarHeight,
    backgroundColor: '#ecf0f1',
  },
  webview: {
    flex: 1,
	opacity: 0.99,
    backgroundColor: 'rgb(82, 86, 89)',
  },
})

type Props = {
  source: {
    uri?: string,
    base64?: string
  },
  style: object
}

type State = {
  ready: boolean,
  android: boolean,
  ios: boolean,
  data?: string,
}

class PdfReader extends Component<Props, State> {
  state = { ready: false, android: false, ios: false, data: undefined }

  async init() {
    try {
      const { source } = this.props
      const ios = Platform.OS === 'ios'
      const android = Platform.OS === 'android'

      this.setState({ ios, android })
      let ready = false
      let data = undefined
	  console.log("URI: " + source.uri);
      if (
        source.uri &&
        android &&
        (source.uri.startsWith('http') ||
          source.uri.startsWith('file') ||
          source.uri.startsWith('content'))
      ) {
        data = await fetchPdfAsync(source.uri)
        ready= !!data
      } else if (source.base64 && source.base64.startsWith('data')) {
        data = source.base64
        ready = true
      } else if (ios) {
        data = source.uri
      } else {
        alert('source props is not correct')
        return
      }

      if (android) {
        await writeWebViewReaderFileAsync(data)
      }

      this.setState({ ready, data })
    } catch (error) {
      alert('Sorry, an error occurred.')
      console.error(error)
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
    const { ready, data, ios, android } = this.state
    const { style } = this.props

    if (data && ios) {
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
	  console.log("Rendering Android... " + htmlPath);
      return (
        <View style={[styles.container, style]}>
          <WebView
			onLoadEnd={()=>console.log("Load ended")}
			onLoadStart={()=>console.log("Load started")}
			onError={(error)=>console.log("Error: " + error)}
			originWhitelist={['*']}
			allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
			allowUniversalAccessFromFileURLs={true}
			domStorageEnabled={true}
            style={styles.webview}
			androidHardwareAccelerationDisabled={true}
            source={{uri: htmlPath}}
            mixedContentMode="always"
          />
        </View>
      )
    }

    return <Loader />
  }
}

export default PdfReader