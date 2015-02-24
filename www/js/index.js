/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * 'License'); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        var button = document.getElementById('volumeup');
        button.addEventListener('click', this.onVolumeUpPressed, false);

        button = document.getElementById('volumedown');
        button.addEventListener('click', this.onVolumeDownPressed, false);

        button = document.getElementById('mute');
        button.addEventListener('click', this.onMutePressed, false);

        button = document.getElementById('channelup');
        button.addEventListener('click', this.onChannelUpPressed, false);

        button = document.getElementById('channeldown');
        button.addEventListener('click', this.onChannelDownPressed, false);

    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        // Connect to bus
        console.log('Connecting to bus');
        app.displayStatus('Connecting to bus...');
        if (AllJoyn) {
            AllJoyn.connect(app.onBusConnected, app.getFailureFor('AllJoyn.connect'));
        } else {
            console.log('Error: AllJoyn not found. (Is the plugin installed?)');
        }
    },
    onBusConnected: function(bus) {
        app.bus = bus;

        var proxyObjects = [{
                path: '/Control/TV',
                interfaces: [
                    [
                        '#org.freedesktop.DBus.Introspectable',
                        '?Introspect >s',
                        ''
                    ],
                    [
                        'org.freedesktop.DBus.Properties',
                        '?Get <s <s >v',
                        '?Set <s <s <v',
                        '?GetAll <s >a{sv}',
                        ''
                    ],
                    [
                        'com.lg.Control.Mouse',
                        '?ClickMouse',
                        '?MoveMouse position<n <n',
                        '?WheelMouse direction<q',
                        '@MousePosition =(ii)',
                        '@Version >q',
                        ''
                    ],
                    [
                        'org.alljoyn.Control.Volume',
                        '?AdjustVolume increments<n',
                        '!MuteChanged newMute>b',
                        '!VolumeChanged newVolume>n',
                        '@Mute =b',
                        '@Version >q',
                        '@Volume =n',
                        '@VolumeRange >(nnn)',
                        ''
                    ],
                    [
                        'com.lg.Control.TV',
                        '!ChannelListChanged',
                        '!ChannelNumberChanged channelDescriptor>(sqss)',
                        '?DownChannel',
                        '?GetChannelList startingRecord<q numRecords<q listOfChannels>a(sqss)',
                        '!InputSourceChanged newInputSource>q',
                        '?KeyInput <q',
                        '?UpChannel',
                        '@ChannelID =s',
                        '@InputSource =q',
                        '@SupportedInputSources >a(qss)',
                        '@Version >q',
                        ''
                    ],
                    null
                ]
            },
            null
        ];
        AllJoyn.registerObjects(app.onRegiteredObjects, app.getFailureFor('AllJoyn.RegisterObject'), null, proxyObjects);
    },
    onRegiteredObjects: function() {
        app.displayStatus('Looking for TV...');
        app.bus.addInterfacesListener(['org.alljoyn.Control.Volume', 'com.lg.Control.TV'], app.onFoundTV);
    },
    onFoundTV: function(aboutAnnouncement) {
        app.displayStatus('Found TV: ' + aboutAnnouncement.DeviceName[1] + ' @ ' + aboutAnnouncement.port);
        app.tvInfo = aboutAnnouncement;
        var service = {
            name: aboutAnnouncement.message.sender,
            port: aboutAnnouncement.port,
        };
        app.bus.joinSession(app.onJoinedTVSession, app.getFailureFor('bus.joinSession'), service);
    },
    onJoinedTVSession: function(tvSession) {
        app.tvSession = tvSession;
        app.displayStatus('Joined TV Session: ' + tvSession.sessionId);
        document.getElementById('connectedhdr').textContent = 'Connected To: ' + app.tvInfo.DeviceName[1];

        // Add some functions for clear code later on
        app.tvSession.channelUp = function() {
            var channelUpIndexList = [2, 0, 4, 6];
            app.tvSession.callMethod(app.getSuccessFor('channelUp'), app.getFailureFor('channelUp'), app.tvSession.sessionHost, null, channelUpIndexList, "", []);
        };

        app.tvSession.channelDown = function() {
            var channelDownIndexList = [2, 0, 4, 2];
            app.tvSession.callMethod(app.getSuccessFor('channelDown'), app.getFailureFor('channelDown'), app.tvSession.sessionHost, null, channelDownIndexList, "", []);
        };

        app.tvSession.volumeUp = function() {
            var adjustVolumeIndexList = [2, 0, 3, 0]; // Proxy object List, First Object, 4th Interface, first member
            app.tvSession.callMethod(app.getSuccessFor('volumeUp'), app.getFailureFor('volumeUp'), app.tvSession.sessionHost, null, adjustVolumeIndexList, 'n', [1], null);
        };

        app.tvSession.volumeDown = function() {
            var adjustVolumeIndexList = [2, 0, 3, 0]; // Proxy object List, First Object, 4th Interface, first member
            app.tvSession.callMethod(app.getSuccessFor('volumeDown'), app.getFailureFor('volumeDown'), app.tvSession.sessionHost, null, adjustVolumeIndexList, 'n', [-1], null);
        };

        app.tvSession.setProperty = function(interfaceName, propertyName, propertyValues, successCallback, errorCallback) {
            var setPropertyIndexList = [2, 0, 1, 1];
            app.tvSession.callMethod(successCallback, errorCallback, app.tvSession.sessionHost, null, setPropertyIndexList, 'ssv', [interfaceName, propertyName].concat(propertyValues), null);
        };

        app.tvSession.getProperty = function(interfaceName, propertyName, successCallback, errorCallback) {
            var getPropertyIndexList = [2, 0, 1, 0];
            var removeVariantSignatureSuccessCallback = function(message) {
                // Remove the first argument which is the variant signature
                // For this app we will assume the caller knows what is coming based on what property they are getting
                message.arguments.shift();
                successCallback(message);
            };
            app.tvSession.callMethod(removeVariantSignatureSuccessCallback, errorCallback, app.tvSession.sessionHost, null, getPropertyIndexList, 'ss', [interfaceName, propertyName], 'v');
        };

        app.tvSession.setMute = function(muted) {
            app.tvSession.setProperty('org.alljoyn.Control.Volume', 'Mute', ['b', muted], app.getSuccessFor('mute'), app.getFailureFor('mute'));
        };

        app.tvSession.getMute = function(successCallback, errorCallback) {
            app.tvSession.getProperty('org.alljoyn.Control.Volume', 'Mute', successCallback, errorCallback);
        };

        app.tvSession.getVolume = function(successCallback, errorCallback) {
            app.tvSession.getProperty('org.alljoyn.Control.Volume', 'Volume', successCallback, errorCallback);
        };

        app.tvSession.getVolumeRange = function(successCallback, errorCallback) {
            app.tvSession.getProperty('org.alljoyn.Control.Volume', 'VolumeRange', successCallback, errorCallback);
        };

        app.tvSession.getInputSource = function(successCallback, errorCallback) {
            app.tvSession.getProperty('com.lg.Control.TV', 'InputSource', successCallback, errorCallback);
        };

        app.tvSession.setInputSource = function(inputSourceIndex) {
            app.tvSession.setProperty('com.lg.Control.TV', 'InputSource', ['q', inputSourceIndex], app.getSuccessFor('setInputSource'), app.getFailureFor('setInputSource'));
        };

        app.tvSession.getSupportedInputSources = function(successCallback, errorCallback) {
            app.tvSession.getProperty('com.lg.Control.TV', 'SupportedInputSources', successCallback, errorCallback);
        };

        app.tvSession.getChannelID = function(successCallback, errorCallback) {
            app.tvSession.getProperty('com.lg.Control.TV', 'ChannelID', successCallback, errorCallback);
        };

        // Setup listeners for signals
        var volumeChangedSignalIndexList = [2, 0, 3, 2];
        app.bus.addListener(volumeChangedSignalIndexList, 'n', app.onVolumeChanged);

        var muteChangedSignalIndexList = [2, 0, 3, 1];
        app.bus.addListener(muteChangedSignalIndexList, 'b', app.onMuteChanged);

        var inputSourceChangedIndexList = [2, 0, 4, 4];
        app.bus.addListener(inputSourceChangedIndexList, 'q', app.onInputSourceChanged);

        var channelNumberChangedIndexList = [2, 0, 4, 1];
        app.bus.addListener(channelNumberChangedIndexList, '(sqss)', app.onChannelNumberChanged);

        var controls = document.querySelector('.controls');
        controls.setAttribute('style', 'display:block;');

        var onGetSupportedInputSources = function(message) {
            var args = message.arguments;
            app.inputSources = [];
            var inputSources = args[0];
            app.resetInputControls();
            for (var source in inputSources) {
                var sourceIndex = inputSources[source][0];
                var sourceName = inputSources[source][2];
                app.inputSources[sourceIndex] = sourceName;
                console.log(inputSources[source][0] + ' ' + inputSources[source][2]);
                app.addInputControl(sourceIndex, sourceName);
            }

            // Once we get all the sources. Query the current input source to display the selected one
            app.tvSession.getInputSource(app.onInputSourceChanged, app.getFailureFor('getInputSource'));
        };
        app.tvSession.getSupportedInputSources(onGetSupportedInputSources, app.getFailureFor('getSupportedInputSources'));
    },
    resetInputControls: function() {
        var inputControls = document.getElementById('inputcontrols');
        inputControls.innerHTML = '';
        var inputHeader = document.createElement('h2');
        inputHeader.textContent = "input";
        inputControls.appendChild(inputHeader);
    },
    addInputControl: function(inputIndex, inputName) {
        var inputControls = document.getElementById('inputcontrols');

        var inputControl = document.createElement('div');
        inputControl.className = 'control';
        inputControl.id = 'input' + inputIndex;
        var inputControlContent = document.createTextNode(inputName);
        inputControl.appendChild(inputControlContent);

        inputControl.addEventListener('click', function() {
            app.tvSession.setInputSource(inputIndex);
        }, false);

        inputControls.appendChild(inputControl);
    },
    updateSelectedInput: function(inputIndex) {
        var selectedControl = document.querySelector('.control.selected');
        if (selectedControl) {
            selectedControl.className = 'control';
        }

        var inputControl = document.getElementById('input' + inputIndex);
        if (inputControl) {
            inputControl.className = 'control selected';
        }
    },
    onChannelNumberChanged: function(message) {
        var args = message.arguments;
        //Unfortunately this doesn't give us meaningful data
        // So ask for channel id
        app.tvSession.getChannelID(app.receiveChannelID, app.getFailureFor('getChannelID'));
    },
    receiveChannelID: function(message) {
        // Channel ID seems to come back in a format like 1_23_23_0_0_0_0 ...
        // Where on limited tests 23 would be the channel number and 1 some indication of 
        // the channel source (e.g. DTV cable or DTV antenna)
        var args = message.arguments;
        var channelID = args[0];
        var channelRe = /(\d+)_(\d+)(.*)/;
        if (channelRe.test(channelID)) {
            var matches = channelID.match(channelRe);
            channelID = matches[1] + '-' + matches[2];
        }
        var channelStatus = document.getElementById('channelstatus');
        channelstatus.textContent = 'CH: ' + channelID;
    },
    setVolumeStatus: function(volumeStatusContent) {
        var volumeStatus = document.getElementById('volumestatus');
        volumeStatus.textContent = volumeStatusContent;
    },
    onMuteChanged: function(message) {
        var mutedArgs = message.arguments;
        var muted = false;
        if (mutedArgs) {
            muted = mutedArgs[0];
        }
        app.displayStatus('MuteChanged: ' + muted);
        if (muted) {
            app.setVolumeStatus('Muted');
        } else {
            app.tvSession.getVolume(app.onVolumeChanged, app.getFailureFor('getVolume'));
        }
    },
    onVolumeChanged: function(message) {
        app.displayStatus('VolumeChanged: ' + message.arguments);
        app.setVolumeStatus('Vol: ' + message.arguments);
    },
    onInputSourceChanged: function(message) {
        app.displayStatus('InputSourceChanged: ' + message.arguments);
        if (app.inputSources) {
            app.updateSelectedInput(message.arguments);
            app.displayStatus('InputSourceChanged: ' + app.inputSources[message.arguments]);
        }
    },
    onVolumeDownPressed: function() {
        if (app.tvSession) {
            app.tvSession.volumeDown();
        }
    },
    onVolumeUpPressed: function() {
        if (app.tvSession) {
            app.tvSession.volumeUp();
        }
    },
    onMutePressed: function() {
        if (app.tvSession) {
            app.tvSession.setMute(true);
        }
    },
    onChannelUpPressed: function() {
        if (app.tvSession) {
            app.tvSession.channelUp();
        }
    },
    onChannelDownPressed: function() {
        if (app.tvSession) {
            app.tvSession.channelDown();
        }
    },
    getSuccessFor: function(successType) {
        var successMsg = 'Success';
        if (successType) {
            successMsg = 'Success: ' + successType;
        }
        return function() {
            console.log(JSON.stringify(arguments));
            app.displayStatus(successMsg);
        };
    },
    getFailureFor: function(failureType) {
        var failureMsg = 'Failure';
        if (failureType) {
            failureMsg = 'Failure during: ' + failureType;
        }
        return function(error) {
            console.log(failureMsg);
            if (error) {
                console.log('Error: ' + error);
            }
        };
    },
    displayStatus: function(status) {
        console.log(status);
        var statusElement = document.getElementById('status');
        statusElement.textContent = status;
    },
};

app.initialize();