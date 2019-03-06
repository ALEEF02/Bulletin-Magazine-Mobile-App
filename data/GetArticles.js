/*
import firebase from "firebase";
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
var database = firebase.database();
var allArticles;
var storage = firebase.storage();
var storageRef = storage.ref();
var articleList = [];
var allArticlesRef;
function addArticlesToList() {
	firebase.database().ref('articles').once('value').then(function(snapshot) {
		allArticles = snapshot.val();
		console.log('All articles: ' + JSON.stringify(allArticles));
		var tempArticleObj = {data:[], title: 'Articles'};
		Object.keys(allArticles).forEach(function (item) {
			tempArticleObj['data'].push({
				title: allArticles[item].title,
				date: allArticles[item].formatDate
			});
		});
		articleList.push(tempArticleObj);
	});
}

console.log('Article list to export: ' + JSON.stringify(articleList));
export {articleList};
export {storageRef};
export {allArticlesRef};
export {addArticlesToList};
*/