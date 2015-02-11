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

        button = document.getElementById('test');
        button.addEventListener('click', this.onTestPressed, false);

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
    onFoundTV: function(tvInfo) {
        app.displayStatus('Found TV: ' + tvInfo.name + ' @ ' + tvInfo.port);
        app.tvInfo = tvInfo;
        var service = {
            name: tvInfo.name,
            port: tvInfo.port
        };
        app.bus.joinSession(app.onJoinedTVSession, app.getFailureFor('bus.joinSession'), service);
    },
    onJoinedTVSession: function(tvSession) {
        app.tvSession = tvSession;
        app.displayStatus('Joined TV Session: ' + tvSession.sessionId);

        // Add some functions for clear code later on
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
            app.tvSession.callMethod(successCallback, errorCallback, app.tvSession.sessionHost, null, setPropertyIndexList, 'ssv', [interfaceName, propertyName].concat(propertyValues), 'v');
        };

        app.tvSession.getProperty = function(interfaceName, propertyName, successCallback, errorCallback) {
            var getPropertyIndexList = [2, 0, 1, 0];
            app.tvSession.callMethod(successCallback, errorCallback, app.tvSession.sessionHost, null, getPropertyIndexList, 'ss', [interfaceName, propertyName], 'v');
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

        app.tvSession.setInputSource = function(inputSourceIndex) {
            app.tvSession.setProperty('com.lg.Control.TV', 'InputSource', ['q', inputSourceIndex], app.getSuccessFor('setInputSource'), app.getFailureFor('setInputSource'));
        };

        app.tvSession.getSupportedInputSources = function(successCallback, errorCallback) {
            app.tvSession.getProperty('com.lg.Control.TV', 'SupportedInputSources', successCallback, errorCallback);
        };

        // Setup listeners for signals
        var volumeChangedSignalIndexList = [2, 0, 3, 2];
        app.bus.addListener(volumeChangedSignalIndexList, 'n', app.onVolumeChanged);

        var muteChangedSignalIndexList = [2, 0, 3, 1];
        app.bus.addListener(muteChangedSignalIndexList, 'b', app.onMuteChanged);

        var inputSourceChangedIndexList = [2, 0, 4, 4];
        app.bus.addListener(inputSourceChangedIndexList, 'q', app.onInputSourceChanged);

        var controls = document.querySelector('.controls');
        controls.setAttribute('style', 'display:block;');

        var onGetSupportedInputSources = function(args) {
            app.inputSources = [];
            var inputSources = args[0];
            for (var source in inputSources) {
                var sourceIndex = inputSources[source][0];
                var sourceName = inputSources[source][2];
                app.inputSources[sourceIndex] = sourceName;
                console.log(inputSources[source][0] + ' ' + inputSources[source][2]);
                app.addInputControl(sourceIndex, sourceName);
            }

        };
        app.tvSession.getSupportedInputSources(onGetSupportedInputSources, app.getFailureFor('getSupportedInputSources'));
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
        console.log('Looking for selected');
        var selectedControl = document.querySelector('.control.selected');
        if (selectedControl) {
            selectedControl.className = 'control';
        }

        var inputControl = document.getElementById('input' + inputIndex);
        if (inputControl) {
            inputControl.className = 'control selected';
        }
    },
    setVolumeStatus: function(volumeStatusContent) {
        var volumeStatus = document.getElementById('volumestatus');
        volumeStatus.textContent = volumeStatusContent;
    },
    onMuteChanged: function(mutedArgs) {
        var muted = false;
        if (mutedArgs) {
            muted = mutedArgs[0];
        }
        app.displayStatus('MuteChanged: ' + muted);
        if (muted) {
            console.log("Muted!");
            app.setVolumeStatus('Muted');
        } else {
            console.log("Not muted!");
            app.tvSession.getVolume(function(args) {
                app.onVolumeChanged(args[0]);
            }, app.getFailureFor('getVolume'));
        }
    },
    onVolumeChanged: function(volume) {
        app.displayStatus('VolumeChanged: ' + volume);
        app.setVolumeStatus('Vol: ' + volume);
    },
    onInputSourceChanged: function(inputSource) {
        app.displayStatus('InputSourceChanged: ' + inputSource);
        if (app.inputSources) {
            app.updateSelectedInput(inputSource);
            app.displayStatus('InputSourceChanged: ' + app.inputSources[inputSource]);
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
    onTestPressed: function() {
        if (app.tvSession) {
            app.tvSession.getProperty('com.lg.Control.Mouse', 'MousePosition', app.getSuccessFor('getMousePosition'), app.getFailureFor('getMousePosition'));
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