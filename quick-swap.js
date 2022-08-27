/********************************************************
Copyright (c) 2022 Cisco and/or its affiliates.
This software is licensed to you under the terms of the Cisco Sample
Code License, Version 1.1 (the "License"). You may obtain a copy of the
License at
               https://developer.cisco.com/docs/licenses
All use of the material herein must be in accordance with the terms of
the License. All rights not expressly granted by the License are
reserved. Unless required by applicable law or agreed to separately in
writing, software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
or implied.
*********************************************************
 * 
 * Macro Author:      	William Mills
 *                    	Technical Solutions Specialist 
 *                    	wimills@cisco.com
 *                    	Cisco Systems
 * 
 * Version: 1-0-0
 * Released: 08/23/22
 * 
 * This is a simple macro makes it easy to swap presentations between two displays
 * while out of call. It provides an single button only when the two presentation
 * previews present and hids the button when there is isn't enough presentations or
 * while in call.
 * 
 ********************************************************/
import xapi from 'xapi';

const config = {
  defaultRoles: {     // Spectify the default Output Roles
    1: 'Auto',        // Format eg. (Output Number): "RolesOutput = 1, Role = 'Auto'
    2: 'Auto'         // <= In this case Output = 2, Role = 'Auto
  },
  swappedRoles: {     // Spectify the swapped Output Roles
    1: 'Second',      // Same format as above with the defaults
    2: 'First'        // In this example the outputs are flipped from how 'Auto' would work
  },
  buttonName: 'Quick Swap',   // This is the name of the button which is displayed
  panelId: 'quick-swap'       // This is the name of the buttons panelId (not visible to user)
}

function main() {
  createPanel();
  presCallEvent();
  xapi.Event.UserInterface.Extensions.Panel.Clicked.on(monitorButton);
  xapi.Event.PresentationPreviewStarted.on(presCallEvent);
  xapi.Event.PresentationPreviewStopped.on(presCallEvent);
  xapi.Event.CallSuccessful.on(presCallEvent);
  xapi.Event.CallDisconnect.on(presCallEvent);
}
main();

// Monitor for button presses
function monitorButton(event) {
  if (event.PanelId === config.panelId) {
    console.log(`${config.buttonName} pressed`);
    toggleRoles();
  }
}

// Process all presentation and call events
// This function will only show the panel when
// There are 2 or more local presentations and
// there are no active calls
async function presCallEvent(event){
  console.log(event);
  console.log('Preview Event');
  const presentations = await xapi.Status.Conference.Presentation.LocalInstance.get();
  const calls = await xapi.Status.Call.get()
  console.log('Number of presentations: ' +presentations.length);
  console.log('Number of calls: ' +calls.length);
  if( presentations.length > 1 && calls.length < 1){
    showPanel();
  } else {
    hidePanel();
  }
}

// Resets the monitor roles back to default
function resetMonitorRoles(){
  console.log('Resetting Monitor Roles');
  for (const output in config.defaultRoles) {
    console.log(`Setting [${output}] to ${config.defaultRoles[output]}`);
    xapi.Config.Video.Output.Connector[output].MonitorRole.set(config.defaultRoles[output]);
  }
}

// Toggle the current monitor roles between defaults and swapped values
async function toggleRoles() {
  console.log('Toggling Monitor Roles')
  for (const output in config.defaultRoles) {
    const current = await xapi.Config.Video.Output.Connector[output].MonitorRole.get();
    if(config.defaultRoles[output] === current) {
      console.log(`Setting [${output}] to ${config.swappedRoles[output]}`);
      xapi.Config.Video.Output.Connector[output].MonitorRole.set(config.swappedRoles[output]);
    } else {
      console.log(`Setting [${output}] to ${config.defaultRoles[output]}`);
      xapi.Config.Video.Output.Connector[output].MonitorRole.set(config.defaultRoles[output]);
    }
  }
}

// Show the panel
function showPanel() {
  console.log('Showing Panel');
  xapi.Command.UserInterface.Extensions.Panel.Update(
    { PanelId: config.panelId, Visibility: 'Auto' });
}

// Hide the panel and reset monitor roles
function hidePanel() {
  console.log('Hiding Panel');
  xapi.Command.UserInterface.Extensions.Panel.Update(
    { PanelId: config.panelId, Visibility: 'Hidden' });
  resetMonitorRoles();
}

// Here we create the Button UI
function createPanel() {
  const panel = `
  <Extensions>
    <Version>1.9</Version>
    <Panel>
      <Type>Home</Type>
      <Location>HomeScreen</Location>
      <Icon>Input</Icon>
      <Color>#FC5143</Color>
      <Name>${config.buttonName}</Name>
      <ActivityType>Custom</ActivityType>
    </Panel>
  </Extensions>`;
  xapi.Command.UserInterface.Extensions.Panel.Save(
    { PanelId: config.panelId },
    panel
  )
}
