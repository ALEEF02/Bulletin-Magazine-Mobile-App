//Import Modules
import React from 'react';
import Touchable from 'react-native-platform-touchable';
import {
	AsyncStorage,
	Dimensions,
	Image,
	InteractionManager,
	ListView,
	Modal,
	Platform,
	SafeAreaView,
	ScrollView,
	SectionList,
	StyleSheet,
	Text,
	TouchableHighlight,
	TouchableOpacity,
	View,
	WebView
} from 'react-native';

import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as WebBrowser from 'expo-web-browser';
import * as Font from 'expo-font';
import * as Icon from '@expo/vector-icons';

import {
	MonoText
} from '../components/StyledText';

import firebase from "firebase";
import PDFReader from '../rn-pdf-reader-js/index';
import TabBarIcon from '../components/TabBarIcon';
import Colors from '../constants/Colors';

//Fix issue on Android with Firebase and setTimeout
const _setTimeout = global.setTimeout;
const _clearTimeout = global.clearTimeout;
const MAX_TIMER_DURATION_MS = 60 * 1000;
if (Platform.OS === 'android') {
  const timerFix = {};
  const runTask = (id, fn, ttl, args) => {
    const waitingTime = ttl - Date.now();
    if (waitingTime <= 1) {
      InteractionManager.runAfterInteractions(() => {
        if (!timerFix[id]) {
          return;
        }
        delete timerFix[id];
        fn(...args);
      });
      return;
    }
    const afterTime = Math.min(waitingTime, MAX_TIMER_DURATION_MS);
    timerFix[id] = _setTimeout(() => runTask(id, fn, ttl, args), afterTime);
  };
  global.setTimeout = (fn, time, ...args) => {
    if (MAX_TIMER_DURATION_MS < time) {
      const ttl = Date.now() + time;
      const id = '_lt_' + Object.keys(timerFix).length;
      runTask(id, fn, ttl, args);
      return id;
    }
    return _setTimeout(fn, time, ...args);
  };
  global.clearTimeout = id => {
    if (typeof id === 'string' && id.startsWith('_lt_')) {
      _clearTimeout(timerFix[id]);
      delete timerFix[id];
      return;
    }
    _clearTimeout(id);
  };
}

//Initialize Firebase
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
var source = { uri: 'https://www.orimi.com/pdf-test.pdf' };

//PDF Render Class
class PDF extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = { uri: "", base64: ""};
		console.log('Current Mag: ' + currentMag);
		//Download the touched magazine
			try {
				console.log("Searching for '" + currentMag + "'");
				//MIGRATE FILESYSTEM
				/*AsyncStorage.getItem('@' + currentMag).then((value) => {
					if (value !== null) {
						console.log("Found magazine in local data");
						this.setState({base64: value});
					} else {
						console.log("Did not find magazine in local data");
						currentMag.getDownloadURL().then((uri)=>this.setState({uri}));
					}
				});*/
				readPermanent(currentMag).then((value) => {
					if (value !== null) {
						console.log("Found magazine in local data: " + value.substring(0,10));
						this.setState({base64: value});
					} else {
						console.log("Did not find magazine in local data");
						currentMag.getDownloadURL().then((uri)=>this.setState({uri}));
					}
				});
			} catch (error) {
				console.warn("Error retrieving mag: " + error);
				currentMag.getDownloadURL().then((uri)=>this.setState({uri}));
			}
	}

    render() {
		if (this.state.uri != "" || this.state.base64 != "") {
			console.log("URI: '" + this.state.uri + "' Base64: '" + this.state.base64 + "' currentMag: " + currentMag);
		}
		return (
			<View style={styles.container}>
				{
					this.state.uri != "" ? <PDFReader style={{flex:1}} source={{ uri:this.state.uri }} magName={{ name:currentMag }} /> : 
					this.state.base64 != "" ? <PDFReader style={{flex:1}} source={{ base64:this.state.base64 }} magName={{ currentMag }} /> : 
					<Text>Loading...</Text>
				}
			</View>
		);
	}
}

//Article Selection Creator
class SectionListItem extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			modalVisible: false,
			openArticle: false
		};
		this.getValue = this.getValue.bind(this);
	}

	setModalVisible(visible) {
		this.setState({ modalVisible: visible });
	}

	getValue() {
		return this.state.openArticle;
	}

	resetModal() {
		this.setState({ openArticle: false });
	}
	
	//When an article is clicked
	_openArticle = (articleName) => {
		console.log('Clicked ' + articleName);
		currentMag = storageRef.child(articleName);
		//Set the currentMag to the corresponding article
		this.setState(previousState => (
			{ openArticle: !previousState.openArticle }
		));
		this.setModalVisible(true);
	}
	
	_goBack = () => {
		return (
			<View style={styles.container}>
				<ArticleList />
			</View>
		);
	}

	render() {
		if (this.state.openArticle) {
			console.log('Beginning main article render');
			return (
				
				<View style={{
					position: 'relative',
					flex: 1
				}}>

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
								marginTop: 8,
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

					<Modal
						animationType="slide"
						transparent={false}
						visible={this.state.modalVisible}
						onRequestClose={this.resetModal.bind(this)}>
						<View style={{ marginTop: 22, flex: 1}}>
							<View style={{ flex: 1}}>
								<TouchableHighlight
									onPress={() => {
										this.setModalVisible(!this.state.modalVisible);
										this.resetModal();
									}}>
									<Text style={{textAlign: "center", fontSize: 20, marginBottom: 10,}}>Close Article</Text>
								</TouchableHighlight>
								<View style={{ flex: 1}}>
									<PDF />
								</View>
							</View>
						</View>
					</Modal>
				</View>
			);
		}

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
						<View style={{
							backgroundColor: '#CCCCCC',
							height: 1,
							margin: 6,
							marginLeft: 15,
							marginRight: 10
						}}>
						</View>
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
					marginTop: 20,
					marginLeft: 20,
					marginBottom: 20
				}}>{this.props.section.title}
				</Text>
			</View>
		);
	}
}

//Article List Creator
class ArticleList extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			articleListAquired: false,
			modalVisible: false
		};

		function compare(a, b) {
			const dateA = a.date;
			const dateB = b.date;
			var comparison = 0;
			if (dateA > dateB) {
				comparison = 1;
			} else if (dateA < dateB) {
				comparison = -1;
			}
			return comparison;
		}

		var allArticles;
		//Download all articles from the Firebase database
		var allArticlesRef = firebase.database().ref('articles').once('value').then(function (snapshot) {
			allArticles = snapshot.val();
			console.log('All articles: ' + JSON.stringify(allArticles));
			allArticles.sort(compare);
			allArticles.reverse();
			console.log('All articles sorted: ' + JSON.stringify(allArticles));
			var tempArticleObj = { data: [], title: 'Articles' };
			//Format downloaded articles
			Object.keys(allArticles).forEach(function (item) {
				tempArticleObj['data'].push({
					title: allArticles[item].title,
					date: allArticles[item].formatDate,
					fileName: allArticles[item].fileName
				});
			});
			articleList.push(tempArticleObj);
			//Indicate to the app that the articles have been successfully downloaded and are ready for display
			this.setState(previousState => (
				{ articleListAquired: !previousState.articleListAquired }
			))
		}.bind(this));
	}

	render() {
		if (!this.state.articleListAquired) {
			return (
				<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
					<Text>Loading Articles...</Text>
				</View>
			);
		}

		return (
			<View style={styles.container}>
				<SectionList
					renderItem={({ item, index }) => {
						return (
							<SectionListItem
								item={item}
								index={index} />
						);
					}}
					renderSectionHeader={({ section }) => {
						return (
							<SectionHeader section={section} />
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

//Main Render
export default class HomeScreen extends React.Component {
	
	static navigationOptions = {
		title: 'Articles',
		header: null,
	};

	constructor(props) {
		super(props);
		this.state = {
			modalVisible: false
		};
	}

	setModalVisible(visible) {
		this.setState({ modalVisible: visible });
	}

	render() {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.container}>
					<ArticleList />
				</View>
			</SafeAreaView>
		);
	}
}

//App styling, similar to CSS
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	safeArea: {
		flex: 1,
		backgroundColor: '#ddd'
	},
	pdf: {
		flex: 1,
		width: Dimensions.get('window').width,
		paddingTop: 500,
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