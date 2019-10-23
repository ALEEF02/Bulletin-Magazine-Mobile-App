import React from 'react';
import Touchable from 'react-native-platform-touchable';
import {
	Dimensions,
	Image,
	ListView,
	Modal,
	Platform,
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
var source = { uri: 'https://www.orimi.com/pdf-test.pdf' };

class PDF extends React.Component {
	constructor(props) {
		super(props);
		this.state = { uri: ""};
		console.log('Current Mag: ' + currentMag);
		currentMag.getDownloadURL().then((uri)=>this.setState({uri}));
	}

    render() {
		return (
			<View style={styles.container}>
				 { this.state.uri != "" ? <PDFReader style={{flex:1}} source={{ uri:this.state.uri }} /> : <Text>Loading...</Text> }
			</View>
		);
	}
}

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

	_openArticle = (articleName) => {
		console.log('Clicked ' + articleName);
		currentMag = storageRef.child(articleName);
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
		this.state = {
			articleListAquired: false,
			modalVisible: false
		};

		var allArticles;
		var allArticlesRef = firebase.database().ref('articles').once('value').then(function (snapshot) {
			allArticles = snapshot.val();
			console.log('All articles: ' + JSON.stringify(allArticles));
			var tempArticleObj = { data: [], title: 'Articles' };
			Object.keys(allArticles).forEach(function (item) {
				tempArticleObj['data'].push({
					title: allArticles[item].title,
					date: allArticles[item].formatDate,
					fileName: allArticles[item].fileName
				});
			});
			articleList.push(tempArticleObj);
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
			<View style={styles.container}>
				<ArticleList />
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
