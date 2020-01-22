import React from 'react';
import * as FileSystem from 'expo-file-system';
import { SectionList, Image, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

const {
	documentDirectory,
	getFreeDiskStorageAsync,
	getTotalDiskCapacityAsync,
	getInfoAsync,
	readDirectoryAsync
} = FileSystem

var avalibleStorage = 0;
var totalStorage = 0;

class ExpoConfigView extends React.Component {
  constructor(props) {
	super(props);
	this.state = { 
		avalibleStorageState: 0, 
		totalStorageState: 0, 
		sections: [
			{ data: [{ value: 0 }], title: 'Storage avalible' },
			{ data: [{ value: 0 }], title: 'Total storage' }
		]
	};
	readDirectoryAsync(documentDirectory).then(subFiles => {
		console.log("Subdirs:" + JSON.stringify(subFiles));
		for (var i = 0; i < subFiles.length; i++) {
			getInfoAsync((documentDirectory + subFiles[i]), {size: true}).then(info => {
				console.log("size: " + info.size + " bytes");
				//TODO: Add all sizes, render
			});
		}
	});
	getFreeDiskStorageAsync().then(freeDiskStorage => {
		avalibleStorage = freeDiskStorage;
		avalibleStorage /= 1000000000;
		avalibleStorage = (avalibleStorage.toFixed(2) + " GB");
		console.log(avalibleStorage);
		this.setState({avalibleStorageState: avalibleStorage});
	});
	getTotalDiskCapacityAsync().then(totalDiskCapacity => {
		totalStorage = totalDiskCapacity;
		totalStorage /= 1000000000;
		totalStorage = (totalStorage.toFixed(2) + " GB");
		console.log(totalStorage);
		this.setState({totalStorageState: totalStorage});
		this.setState({sections: [
			{ data: [{ value: this.state.avalibleStorageState }], title: 'Storage avalible' },
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

  render() {
    return (
		<View style={styles.container}>
			<ExpoConfigView />
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
});