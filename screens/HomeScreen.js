import React from 'react';
import Touchable from 'react-native-platform-touchable';
import {
	Dimensions,
	Image,
	ListView,
	Platform,
	ScrollView,
	SectionList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import {
	WebBrowser,
	Constants,
	Icon,
} from 'expo';

import {
	MonoText
} from '../components/StyledText';

import firebase from "firebase";
import PDFReader from 'rn-pdf-reader-js';
import TabBarIcon from '../components/TabBarIcon';
import Colors from '../constants/Colors';

/*import {
	articleList,
	storageRef,
	allArticlesRef,
	addArticlesToList,
} from '../data/GetArticles';
*/

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
var database = firebase.database();
var storageRef = storage.ref();

var articleList = [];
var currentMag = storageRef.child('issue 6 2.pdf');
var source = {uri:'https://s2.q4cdn.com/235752014/files/doc_downloads/test.pdf',cache:true};

class PDF extends React.Component {
	constructor(props) {
		super(props);
		this.state = {PDF: false};

		currentMag.getDownloadURL().then(function(url) {
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

class SectionListItem extends React.Component {
		_openArticle = (articleName) => {
			console.log('Clicked ' + articleName);
			currentMag = articleName;
			return(
				<View>
					<Touchable
						style={styles.option}
						background={Touchable.Ripple('#ccc', false)}
						onPress={() => this._goBack()}>
						<View style={{
							flex: 1,
							flexDirection: 'column',
							backgroundColor: '#FFFFFF'
						}}>
							<Icon.Ionicons
								name={
								Platform.OS === 'ios'? 
									`ios-arrow-back`
									: 'md-arrow-back'
								}
								size={26}
								style={{ marginBottom: -3 }}
								color={Colors.tabIconDefault}
							/>
							<Text style={{
								color: '#122EFF',
								fontSize: 16,
							}}>
								Back
							</Text>
						</View>
					</Touchable>
					<PDF/>
				</View>
			);
		}
		
		_goBack = () => {
			return (
				<View style={styles.container}>
					<ArticleList/>
				</View>
			);
		}
	
	render() {
		return (
			<View>
				<Touchable
					style={styles.option}
					background={Touchable.Ripple('#ccc', false)}
					onPress={() => this._openArticle(this.props.item.fileName)}>
					<View style={{
						flex: 1,
						flexDirection: 'column',
						backgroundColor: '#FFFFFF'
					}}>
						<Text style={{
							fontSize: 16,
							fontWeight: 'bold',
							color: '#000000',
							marginLeft: 15,
							marginRight: 10,
						}}>
							{this.props.item.title}
						</Text>
						<Text style={{
							fontSize: 16,
							color: '#000000',
							marginLeft: 20,
							marginRight: 10,
						}}>
							{this.props.item.date}
						</Text>
						<View style={{
							backgroundColor: '#CCCCCC',
							height: 1,
							margin: 6,
							marginLeft: 15,
							marginRight: 10
						}}>				
						</View>
					</View>
				</Touchable>
			</View>
		);
	}
}

class SectionHeader extends React.Component {
	render() {
		return (
			<View style={{
				flex: 1,
				backgroundColor: '#222222',
			}}>
				<Text style={{
					fontSize: 16,
					fontWeight: 'bold',
					color: 'white',
					marginTop: 30,
					marginLeft: 20,
					marginBottom: 15
				}}>{this.props.section.title}
				</Text>
			</View>
		);
	}
}

class ArticleList extends React.Component {
	constructor(props) {
		super(props);
		this.state = {articleListAquired: false};
		
		var allArticles;
		var allArticlesRef = firebase.database().ref('articles').once('value').then(function(snapshot) {
			allArticles = snapshot.val();
			console.log('All articles: ' + JSON.stringify(allArticles));
			var tempArticleObj = {data:[], title: 'Articles'};
			Object.keys(allArticles).forEach(function (item) {
				tempArticleObj['data'].push({
					title: allArticles[item].title,
					date: allArticles[item].formatDate,
					fileName: allArticles[item].fileName
				});
			});
			articleList.push(tempArticleObj);
			this.setState(previousState => (
				{articleListAquired: !previousState.articleListAquired}
			))
		}.bind(this));
	}
	
	render() {
		if (!this.state.articleListAquired) {
			return (
				<View style={{flex: 1, justifyContent: "center", alignItems: "center"}}>
					<Text>Loading Articles...</Text>
				</View>
			);
		}
		
		return (
			<View style={styles.container}>
				<SectionList
					renderItem={({item, index}) => {
						return (
							<SectionListItem
								item={item}
								index={index}/>
						);
					}}
					renderSectionHeader={({section}) => {
						return (
							<SectionHeader section={section}/>
						);
					}}
					sections={articleList}
					keyExtractor={(item, index) => item.title}
				>
				</SectionList>
			</View>
		);
	}
}

export default class HomeScreen extends React.Component {
	static navigationOptions = {
		title: 'Articles',
		header: null,
	};
	
	render() {
		/*if (!this.state.articleListAquired) {
			return (
				<View style={styles.container}>
					<Text>Loading Articles...</Text>
				</View>
			);
		}*/
		
        return (
            <View style={styles.container}>
				<ArticleList/>
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
	optionsTitleText: {
		fontSize: 16,
		marginLeft: 15,
		marginTop: 9,
		marginBottom: 12,
	},
	optionIconContainer: {
		marginRight: 9,
	},
	option: {
		backgroundColor: '#fdfdfd',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#EDEDED',
	},
	optionText: {
		fontSize: 15,
		marginTop: 1,
	},
});