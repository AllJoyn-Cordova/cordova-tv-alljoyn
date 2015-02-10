cordova-tv-alljoyn
===========================

A sample Cordova application that can be used to control AllJoyn enabled TVs. The App uses the [Cordova AllJoyn plugin](https://github.com/stefangordon/Cordova-plugin-alljoyn). 

This app is in development. Currently being developed to work against an AllJoyn enabled LG TV.

The app requires an AllJoyn router to be on the local network. The app is very basic currently and just tries to find the first device advertising the Volume interface. It then provides basic buttons to adjust the volume and reports related signals


## Next Steps
- Error checking/reporting
- More UI, Better UI
- Enable app to work against multiple devices
- Limit search to TVs (add TV interface to about filter)
- Provide input source setting capability
- Channel changing 
