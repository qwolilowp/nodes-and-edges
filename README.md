# N O D E S A N D E D G E S

## WHAT IS IT
It is a network sequencer, a AI supported sequencer, a aleatoric-nonaleatoric sequencer, a drawing music notation or experimental notation, a midi sequencer and a audio-data sequencer.

The sequencing is done by arranging nodes (audio/midi/notation events) with edges between each other. The edges just pass the activity around and the nodes are active or not and release activity.

## THE NODES

### MUSIC-NOTATION-NODE

The music-notation-node is not finished now. It is a straight forward new resembling of the idea of the UPIC (Unité Polyagogique Informatique du CEMAMu (Centre d'Etudes de Mathématique et Automatique Musicales), also take a look at Iannis Xenakis post mortem page http://www.iannis-xenakis.org/xen/bio/biography.html) as far as we understand it. To get deeper into the point of viewing music take a look into his work *Formalized music* https://monoskop.org/images/7/74/Xenakis_Iannis_Formalized_Music_Thought_and_Mathematics_in_Composition.pdf

We are not interested in formalizing music. We are up to network sequencing and complex event-driving through this and also to the transformation of drawings into musical control values. We attribute this aleatoric-nonaleatoric, because we do not use chance as a basis for a algorithmic music, but a algorithm to extract control values from drawings. That is more or less a case of serendipity, you can expect certain results, but the results are not fully predictable, but not randomly.

### SPLIT-NODE

There are two nodes to just affect the activity flowing through the arrangement of nodes and edges. The split-node and the sum-node. The split-node is a input and output node for edges, it just passes through activity. It could also delay the passing of activity.


### SUM-NODE

The sum-node has a internal count of incoming activation. If the amount of activity has arrived the node releases a activation. The count could be freely set or is the sum of all incoming connections.

### AUDIO-FILE-NODE

The audiofile-node is a node that can play back audio files. At the moment it is restricted to .wav and .mp3 files.

### AUDIO-RECORDER-NODE

The audio-recorder-node is a node that record a stream from the microphone. If a selection of the audio source is needed post it as a issue. 

### MIDI-NODE

The midi-node release MIDI messages. Note it uses WebMidi API, which must be supported by your browser. Also your operating system needs a MIDI configuration or tool. See the notes in this section: https://github.com/qwolilowp/Z_TENNOT_IU/blob/master/README.md#midi


# USAGE

Visit https://nodesandedges.de/ for a quick test. If you like to install this software, just download the *nadne* Folder and open the *index.html* with your browser or push the *nadne* folder to your HTTP-Server. Note: HTTPS is required because the page requests access to the MIDI- and Audio-Input-Hardware.

## STARTUP

On startup you get a promt to put in a alternative width and height of the workbench area. If you do not input anything you have the browser window size as a input region.

![](DokuPic/001_onstartup.png?raw=true)

Next to the promt you see a large button labeled *Audio ON*, the webpage could not use your microphone without your permission. You hit this button and everything is empty.

![](DokuPic/002_AudioON.png?raw=true)


## MAIN MENU

If you click onto the gray webpage you will get the main menu. And color, we work as colorful as possible. Color will change by using the menus and by the passing activity.

![](DokuPic/003_mainmenu.png?raw=true)

The fist button in the menu does nothing. It is labeled *None*. The second button in the menu, labeled *Add NotationNode*, adds a music-notation-node. The second button in the menu, labeled *Add SplitNode*, adds a split-node to the workbench. The third button of the main menu, labeled *Add SumNode*, adds a sum-node to the webpage. The fourth button, labeled *Add AudioFileNode*, opens a dialog to select a sound file and add a playbacknode to the workbench. The fifth button, labeled *Add AudioRecNode*, opens the microphone to record some noise. After hitting the *Stop Rec* button and naming (promt) your recording, a audio-recording-node is added. The sixth button in the menu, labeled *Add MidiNode*, will add a midi-node to the workbench. With the seventh button you could stop the propagation of activity. The next two buttons will save and open the sequence you build. The data is stored to the local storage and the indexed database of your browser. If you reset the browser caches, that data my get deleted depending on your configuration. The last tree buttons / fileselection. Do export/download the sequence. Imports a saved sequence and reloads the page.  


## NODEMENUS

### Menu: MUSIC NOTATION NODE

![](DokuPic/004_notationnode.png?raw=true)

After the creation of a notation node you get a node displayed and consisting of a menu and a draw section.

The button *CO* - is the target for the start / end of connections between the nodes.

The button *XC* - deletes all outgoing connections of the notation-node.

The button *ED* - opens up/hides the drawing area for manipulation.

![](DokuPic/005_drawingonnode.png?raw=true)

The button *MO* - sets the modus of the notation-node (unused at the moment).

The button *DU* - opens a promt that ask for a new duration value. After a input the new duration is set.

The button *DO* - just activates the node.

The button *MU* - mutes i.e. disables the node. No activation is propagated. Could be used to close parts of the network.


### Menu: SPLIT NODE

### Menu: SUM NODE

### Menu: AUDIO FILE NODE

### Menu: AUDIO RECORDER NODE

### Menu: MIDI NODE

# REQUIREMENTS

# LOOK AT

![](DokuPic/first.png?raw=true)
![](DokuPic/second.png?raw=true)

# TESTED ON

Chrome Browser Version 85.0.4183.102 (Offizieller Build) (64-Bit Linux)

Firefox Browser Version 83.0 (64-Bit Linux)


