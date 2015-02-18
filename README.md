cordova-tv-alljoyn
===========================

A sample Cordova application that can be used to control AllJoyn enabled TVs. The App uses the [Cordova AllJoyn plugin](https://github.com/AllJoyn-Cordova/cordova-plugin-alljoyn). 

This app is in development. Currently being developed to work against an AllJoyn enabled LG TV.

The app requires an AllJoyn router to be on the local network. The app is very basic currently and just tries to find the first device advertising (via [About](https://allseenalliance.org/developers/learn/core/about-announcement/interface)) both the org.alljoyn.Control.Volume and the com.lg.Control.TV interface. When the app successfully joins an AllJoyn session with the TV it will initiate a method call to get the list of available inputs and display a list of them. If this is successful then the app will also ask for the currently selected input source and update the ui accordingly. Clicking an input in the list should change the selected input on the TV. There are also controls for changing the volume and channel on the TV. 



## To Run
```sh
$ git clone https://github.com/AllJoyn-Cordova/cordova-tv-alljoyn.git
$ cd cordova-tv-alljoyn
$ cordova plugin add org.allseen.alljoyn
$ cordova platform add ios
$ cordova run ios
```

## Next Steps
- Error checking/reporting
- More UI, Better UI
- Enable app to work against multiple devices
