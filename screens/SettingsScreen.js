import React from 'react';
import * as FileSystem from 'expo-file-system';
import { Alert, SectionList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';

const {
	cacheDirectory,
	deleteAsync,
	documentDirectory,
	getFreeDiskStorageAsync,
	getTotalDiskCapacityAsync,
	getInfoAsync,
	readDirectoryAsync
} = FileSystem

var avalibleStorage = 0;
var totalStorage = 0;
var usedStorage = 0;

class StorageView extends React.Component {
  constructor(props) {
	super(props);
	this.state = { 
		usedStorageState: "0 MB",
		avalibleStorageState: "0 GB", 
		totalStorageState: "0 GB",
		sections: [
			{ data: [{ value: 0 }], title: 'Storage used by articles' },
			{ data: [{ value: 0 }], title: 'Storage available' },
			{ data: [{ value: 0 }], title: 'Total storage' }
		]
	};
	
	readDirectoryAsync(documentDirectory).then(subFiles => {
		console.log("Subdirs documentDirectory/\n" + JSON.stringify(subFiles));
		var totalDocsFound = 0;
		var totalDocsSized = 0;
		for (var i = 0; i < subFiles.length; i++) {
			if (subFiles[i].includes(".") == true) {
				totalDocsFound++;
				getInfoAsync((documentDirectory + subFiles[i]), {size: true}).then(info => {
					totalDocsSized++;
					console.log("Size: " + info.size + " bytes");
					if (info.size != undefined) {
						usedStorage += info.size;
					}
					if (totalDocsFound == totalDocsSized) {
						usedStorage /= 1000000;
						usedStorage = (usedStorage.toFixed(2) + " MB");
						console.log("Total used storage: " + usedStorage);
						this.setState({usedStorageState: usedStorage});
						this.setState({sections: [
							{ data: [{ value: this.state.usedStorageState }], title: 'Storage used by articles' },
							{ data: [{ value: this.state.avalibleStorageState }], title: 'Storage available' },
							{ data: [{ value: this.state.totalStorageState }], title: 'Total storage' }
						]});
					}
				}).catch(e => {
					console.warn("Error reading file size\n" + e);
				});
			}
		}
		if (totalDocsFound == 0 && totalDocsSized == 0) {
			usedStorage /= 1000000;
			usedStorage = (usedStorage.toFixed(2) + " MB");
			console.log("Total used storage: " + usedStorage);
			this.setState({usedStorageState: usedStorage});
			this.setState({sections: [
				{ data: [{ value: this.state.usedStorageState }], title: 'Storage used by articles' },
				{ data: [{ value: this.state.avalibleStorageState }], title: 'Storage available' },
				{ data: [{ value: this.state.totalStorageState }], title: 'Total storage' }
			]});
		}
	}).catch(e => {
		console.warn("Error reading file size\n" + e);
	});
	
	getFreeDiskStorageAsync().then(freeDiskStorage => {
		avalibleStorage = freeDiskStorage;
		avalibleStorage /= 1000000000;
		avalibleStorage = (avalibleStorage.toFixed(2) + " GB");
		console.log(avalibleStorage);
		this.setState({avalibleStorageState: avalibleStorage});
		this.setState({sections: [
			{ data: [{ value: this.state.usedStorageState }], title: 'Storage used by articles' },
			{ data: [{ value: this.state.avalibleStorageState }], title: 'Storage available' },
			{ data: [{ value: this.state.totalStorageState }], title: 'Total storage' }
		]});
	});
	getTotalDiskCapacityAsync().then(totalDiskCapacity => {
		totalStorage = totalDiskCapacity;
		totalStorage /= 1000000000;
		totalStorage = (totalStorage.toFixed(2) + " GB");
		console.log(totalStorage);
		this.setState({totalStorageState: totalStorage});
		this.setState({sections: [
			{ data: [{ value: this.state.usedStorageState }], title: 'Storage used by articles' },
			{ data: [{ value: this.state.avalibleStorageState }], title: 'Storage available' },
			{ data: [{ value: this.state.totalStorageState }], title: 'Total storage' }
		]});
		console.log("Free storage: " + this.state.avalibleStorageState + ", Total storage: " + this.state.totalStorageState);
	});
  }
  
  render() {

    return (
		this.state.sections[1].data.value != 0 ? <SectionList
			style={styles.container}
			renderItem={this._renderItem}
			renderSectionHeader={this._renderSectionHeader}
			stickySectionHeadersEnabled={true}
			keyExtractor={(item, index) => item.title}
			ListHeaderComponent={ListHeader}
			sections={this.state.sections}
		/> : 
		<Text>Loading...</Text>
    );
  }

  _renderSectionHeader = ({ section }) => {
    return <SectionHeader title={section.title} />;
  };

  _renderItem = ({ item }) => {
    if (item.type === 'color') {
      return (
        <SectionContent>
          {item.value && <Color value={item.value} />}
        </SectionContent>
      );
    } else {
      return (
        <SectionContent>
          <Text style={styles.sectionContentText}>
            {item.value}
          </Text>
        </SectionContent>
      );
    }
  };
}

const ListHeader = () => {
  const { manifest } = Constants;

  return (
    <View style={styles.titleContainer}>
      <View style={styles.titleIconContainer}>
        <AppIconPreview iconUrl={manifest.iconUrl} />
      </View>

      <View style={styles.titleTextContainer}>
        <Text style={styles.nameText} numberOfLines={1}>
          {manifest.name}
        </Text>

        <Text style={styles.slugText} numberOfLines={1}>
          {manifest.slug}
        </Text>

        <Text style={styles.descriptionText}>
          {manifest.description}
        </Text>
      </View>
    </View>
  );
};

const SectionHeader = ({ title }) => {
  return (
    <View style={styles.sectionHeaderContainer}>
      <Text style={styles.sectionHeaderText}>
        {title}
      </Text>
    </View>
  );
};

const SectionContent = props => {
  return (
    <View style={styles.sectionContentContainer}>
      {props.children}
    </View>
  );
};

const AppIconPreview = ({ iconUrl }) => {
  if (!iconUrl) {
    iconUrl =
      'https://s3.amazonaws.com/exp-brand-assets/ExponentEmptyManifest_192.png';
  }

  return (
    <Image
      source={{ uri: iconUrl }}
      style={{ width: 64, height: 64 }}
      resizeMode="cover"
    />
  );
};

const Color = ({ value }) => {
  if (!value) {
    return <View />;
  } else {
    return (
      <View style={styles.colorContainer}>
        <View style={[styles.colorPreview, { backgroundColor: value }]} />
        <View style={styles.colorTextContainer}>
          <Text style={styles.sectionContentText}>
            {value}
          </Text>
        </View>
      </View>
    );
  }
};

export default class SettingsScreen extends React.Component {
  static navigationOptions = {
    title: 'app.json',
  };

	_clearDownloads = () => {
		Alert.alert(
			'Clear Storage',
			'This will delete all magazines locally downloaded and will cause them to be re-downloaded the next time you wish to view them. Are you sure?',
			[{
					text: 'Cancel',
					onPress: () => {
						console.log('Canceling storage clearing');
						return;
					},
					style: 'cancel'
				},
				{
					text: 'OK',
					onPress: () => {
						console.warn('Clearing downloaded documents');
						readDirectoryAsync(documentDirectory).then(subFiles => {
							for (var i = 0; i < subFiles.length; i++) {
								if (subFiles[i].includes(".html") == true || subFiles[i].includes(".pdf") == true) {
									console.log("Deleting " + (documentDirectory + subFiles[i]));
									deleteAsync((documentDirectory + subFiles[i]));
								}
							}
						});
						readDirectoryAsync(cacheDirectory).then(subFiles => {
							for (var i = 0; i < subFiles.length; i++) {
								if (subFiles[i].includes(".html") == true || subFiles[i].includes(".pdf") == true) {
									console.log("Deleting " + (documentDirectory + subFiles[i]));
									deleteAsync((documentDirectory + subFiles[i]));
								}
							}
						});
					}
				},
			], {
				cancelable: false
			}
		)
	}

  render() {
    return (
		<View style={styles.container}>
			<StorageView />
			<TouchableOpacity 
				onPress={() => this._clearDownloads()} 
				style={styles.button}
			>
				<Text style={styles.buttonText}>Clear Storage</Text>
			</TouchableOpacity>
		</View>
	);
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  titleContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 15,
    flexDirection: 'row',
  },
  titleIconContainer: {
    marginRight: 15,
    paddingTop: 2,
  },
  sectionHeaderContainer: {
    backgroundColor: '#fbfbfb',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ededed',
  },
  sectionHeaderText: {
    fontSize: 14,
  },
  sectionContentContainer: {
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 15,
  },
  sectionContentText: {
    color: '#808080',
    fontSize: 14,
  },
  nameText: {
    fontWeight: '600',
    fontSize: 18,
  },
  slugText: {
    color: '#a39f9f',
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  descriptionText: {
    fontSize: 14,
    marginTop: 6,
    color: '#4d4d4d',
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreview: {
    width: 17,
    height: 17,
    borderRadius: 2,
    marginRight: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  colorTextContainer: {
    flex: 1,
  },
  button: {
    backgroundColor: "blue",
    padding: 20,
    borderRadius: 5,
  },
  buttonText: {
    fontSize: 20,
    color: '#fff',
	textAlign: 'center',
  }, 
});