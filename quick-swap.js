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
 * Version: 1-1-0
 * Released: 10/20/22
 * 
 * This is a simple macro makes it easy to swap presentations between two displays
 * while out of call. It provides an single button only when the two presentation
 * previews present and hids the button when there is isn't enough presentations or
 * while in call.
 * 
 ********************************************************/
import xapi from 'xapi';

/*********************************************************
 * Configure the settings below
**********************************************************/

const config = {
  activePrompt: true,           // Display a prompt when two local shares are detected
  promptDuration: 10,           // How long should the prompt display in seconds
  buttonName: 'Quick Swap',     // This is the name of the button which is displayed
  panelId: 'quick-swap',        // (not visible to user) Unique panelId for the button 
  feedbackId: 'swap-feedback'   // (not visible to user) Unique feedbackId for the prompt 
}

/*********************************************************
 * Main function to setup and add event listeners
**********************************************************/

function main() {
  createPanel();
  presCallEvent('Initialize', 'Initialize');
  xapi.Event.UserInterface.Extensions.Panel.Clicked.on(monitorButton);
  xapi.Event.UserInterface.Message.Prompt.Response.on(onPromptResponse);
  xapi.Event.PresentationPreviewStarted.on(e => presCallEvent(e, 'Presentation'));
  xapi.Event.PresentationPreviewStopped.on(e => presCallEvent(e, 'Presentation'));
  xapi.Event.CallSuccessful.on(e => presCallEvent(e, "Call"));
  xapi.Event.CallDisconnect.on(e => presCallEvent(e, 'Call'));
}
main();


let swapping = 0;

// Monitor for button presses
function monitorButton(event) {
  if (event.PanelId === config.panelId) {
    console.log(`${config.buttonName} pressed`);
    swapPresentations()
  }
}

// Process all presentation and call events
// This function will only show the panel when
// There are 2 or more local presentations and
// there are no active calls
async function presCallEvent(event, type){
  console.log(`${type} Event`);
  console.log(event);
  const presentations = await xapi.Status.Conference.Presentation.LocalInstance.get();
  const calls = await xapi.Status.Call.get()
  console.log('Number of presentations: ' +presentations.length);
  console.log('Number of calls: ' +calls.length);
  
  if( presentations.length > 1 && calls.length < 1){ 
    //console.log('Swapping is currently: ' + swapping + ' Local Source is: ' +event.LocalSource)
    if(type == 'Presentation' && swapping == 0){
      showButton()
    } else if(swapping == event.LocalSource){
      console.log('Swapping reset to: 0');
      swapping = 0;
    }
  } else if (swapping == 0) {
    hidePanel();
  }
}

// This function with swap the order of local presentations
async function swapPresentations() {
  const pres = await xapi.Status.Conference.Presentation.LocalInstance.get();
  if(pres.length!=2){
    console.log(`Incorrect number of presentations to perform a swap, count: ${pres.length}, requires: 2`);
    return;
  }
  console.log(`Swapping Presentations, sources ${pres[0].Source} with ${pres[1].Source}`);
  swapping = pres[0].Source;

  console.log('Swapping set to: ' + swapping)
  await xapi.Command.Presentation.Stop({
      Instance: pres[1].id
    });
  await xapi.Command.Presentation.Start({
      Instance: pres[0].id,
      PresentationSource: pres[1].Source,
      SendingMode: pres[1].SendingMode });
  await xapi.Command.Presentation.Start({
      Instance: pres[1].id,
      PresentationSource: pres[0].Source,
      SendingMode: pres[0].SendingMode
      });
}

// Show the panel
function showButton() {
  console.log('Showing Panel');
  xapi.Command.UserInterface.Extensions.Panel.Update(
    { PanelId: config.panelId, Visibility: 'Auto' });

  // If enabled, also display the feedback prompt
  if(config.activePrompt){
    promptPanel();
  }
}

// Hide the panel and reset monitor roles
function hidePanel() {
  console.log('Hiding Panel');
  xapi.Command.UserInterface.Extensions.Panel.Update(
    { PanelId: config.panelId, Visibility: 'Hidden' });
}

function promptPanel(){
  xapi.Command.UserInterface.Message.Prompt.Display({
      Duration: config.promptDuration,
      FeedbackId: config.feedbackId,
      "Option.1": 'Yes',
      "Option.2": 'No',
      Text: 'Two presentations detected, do you want to swap the display order', 
      Title: config.buttonName
    });
}

function onPromptResponse(e) {
  if (e.FeedbackId !== config.feedbackId) return;
  switch (e.OptionId){
    case '1':
      console.log('User requested to swap from prompt');
      swapPresentations();
      break;
    case '2':
      console.log('User requested not to swap from prompt');
      break;
  };
  xapi.Command.UserInterface.Message.Prompt.Clear(
      { FeedbackId: config.feedbackId });
}

// Here we create the Button UI
function createPanel() {
  const panel = `
  <Extensions>
    <Version>1.9</Version>
    <Panel>
      <Type>Home</Type>
      <Location>HomeScreenAndCallControls</Location>
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
