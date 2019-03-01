import React from 'react';
import {
	Dimensions,
	Image,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import {
	WebBrowser,
	Constants,
} from 'expo';

import {
	MonoText
} from '../components/StyledText';

import firebase from "firebase";
import PDFReader from 'rn-pdf-reader-js';

// Initialize Firebase
var config = {
	apiKey: "AIzaSyAvFJ1VI_UNcHd2KJavI4on7PuQUTb1fCU",
	authDomain: "bulletin-magazine.firebaseapp.com",
	databaseURL: "https://bulletin-magazine.firebaseio.com",
	projectId: "bulletin-magazine",
	storageBucket: "bulletin-magazine.appspot.com",
	messagingSenderId: "117437380192"
};
firebase.initializeApp(config);
var storage = firebase.storage();
var storageRef = storage.ref();
var tempMag = storageRef.child('issue 6 2.pdf');
var source = {uri:'https://s2.q4cdn.com/235752014/files/doc_downloads/test.pdf',cache:true};
/*var allPDF = storage.getFiles({directory:'/'}, function(err, files, nextQuery, apiResponse) {
	console.log(files);
});*/

class PDF extends React.Component {
	constructor(props) {
		super(props);
		this.state = {PDF: false};

		tempMag.getDownloadURL().then(function(url) {
			var xhr = new XMLHttpRequest();
			xhr.responseType = 'blob';
			xhr.onload = function(event) {
				var blob = xhr.response;
				console.log('blob from xhr: ' + JSON.stringify(blob));
				var reader = new FileReader();
				reader.onload = function() {
					source.uri = reader.result;
					this.setState(previousState => (
						{PDF: !previousState.PDF}
					))
				}.bind(this);
				reader.readAsDataURL(blob);
			}.bind(this);
			xhr.open('GET', url);
			xhr.send();
			
			
		}.bind(this)).catch(function(error) {
			return (
				<View style={styles.container}>
					<Text>Error: {error}</Text>
				</View>
			);
		});
	}
	
	render() {
		if (!this.state.PDF) {
			return (
				<View style={{flex: 1, justifyContent: "center", alignItems: "center"}}>
					<Text>Loading Articles...</Text>
				</View>
			);
		}
		
		return (
			<View style={styles.container}>
				<PDFReader
					source={source}
					onLoadComplete={(numberOfPages,filePath)=>{
						console.log(`number of pages: ${numberOfPages}`);
					}}
					onPageChanged={(page,numberOfPages)=>{
						console.log(`current page: ${page}`);
					}}
					onError={(error)=>{
						console.log(error);
					}}
					style={styles.pdf}/>
			</View>
			//const source = require('https://firebasestorage.googleapis.com/v0/b/bulletin-magazine.appspot.com/o/issue%206%202.pdf?alt=media&token=e9e915db-1a70-47a2-ba56-63ae8404d606');  // ios only
			//const source = {uri:'bundle-assets://https://firebasestorage.googleapis.com/v0/b/bulletin-magazine.appspot.com/o/issue%206%202.pdf?alt=media&token=e9e915db-1a70-47a2-ba56-63ae8404d606'};

			//const source = {uri:'file:///sdcard/test.pdf'};
			//const source = {uri:"data:application/pdf;base64,..."};
		);
	}	
}

export default class HomeScreen extends React.Component {
	static navigationOptions = {
		header: null,
	};

	render() {
        return (
            <View style={styles.container}>
                <PDF/>
            </View>
        );
	}
}

//App styling, similar to CSS
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	pdf: {
        flex:1,
        width:Dimensions.get('window').width,
    },
	developmentModeText: {
		marginBottom: 20,
		color: 'rgba(0,0,0,0.4)',
		fontSize: 14,
		lineHeight: 19,
		textAlign: 'center',
	},
	contentContainer: {
		paddingTop: 30,
	},
	welcomeContainer: {
		alignItems: 'center',
		marginTop: 10,
		marginBottom: 20,
	},
	welcomeImage: {
		width: 100,
		height: 80,
		resizeMode: 'contain',
		marginTop: 3,
		marginLeft: -10,
	},
	getStartedContainer: {
		alignItems: 'center',
		marginHorizontal: 50,
	},
	homeScreenFilename: {
		marginVertical: 7,
	},
	codeHighlightText: {
		color: 'rgba(96,100,109, 0.8)',
	},
	codeHighlightContainer: {
		backgroundColor: 'rgba(0,0,0,0.05)',
		borderRadius: 3,
		paddingHorizontal: 4,
	},
	getStartedText: {
		fontSize: 17,
		color: 'rgba(96,100,109, 1)',
		lineHeight: 24,
		textAlign: 'center',
	},
	tabBarInfoContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		...Platform.select({
			ios: {
				shadowColor: 'black',
				shadowOffset: {
					height: -3
				},
				shadowOpacity: 0.1,
				shadowRadius: 3,
			},
			android: {
				elevation: 20,
			},
		}),
		alignItems: 'center',
		backgroundColor: '#fbfbfb',
		paddingVertical: 20,
	},
	tabBarInfoText: {
		fontSize: 17,
		color: 'rgba(96,100,109, 1)',
		textAlign: 'center',
	},
	navigationFilename: {
		marginTop: 5,
	},
	helpContainer: {
		marginTop: 15,
		alignItems: 'center',
	},
	helpLink: {
		paddingVertical: 15,
	},
	helpLinkText: {
		fontSize: 14,
		color: '#2e78b7',
	},
});