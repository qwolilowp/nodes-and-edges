
/*

nadne  -> nodes and edges sequnecer, 2021 

GPLv3 copyrigth

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

"use strict";


//load and event wait emulation with
let lock = true;

//globs
let WIDTH = 0;
let HEIGHT = 0;
let mainmenwidth = null;
let mainmenlength = null;
let maxnodemenwidth = null;
let maxnodemenlength = null;


let DARWINGS = []; //draw area part of the node - or lets sy the DATA PART OF THE NODE
let INOUT = []; //indices of connected nodes
let ACTIVEONES = []; //save if node is active, 0 not, 1 active, 2 muted node
let DURATIONS = []; //save external durations of each node
let TRAJ = []; //all trajectories per pict
let MODUS = []; //save all modi of playing a node, 0 - play as wohle with duration, 1 - play as x as time and y as data row, 2 - play ad components in time x is time axis
let AUDIOBUFFER = [];
let AUDIOBUFFERFC = []; // as filecontent

let connlength = 1000;
//let THUMBSIZE = 20; //times smaller
let CADDX = 0;
let CADDY = 0;

//drawing the connections
let connX = null;
let olx = 0;
let oly = 0;
let touchx = null;
let touchy = null;
let backgroundof = "white";
let linecolor = "black";
let inoffset = 0;//20;
let outoffset = 0;//5;
let fromindex = null;
let toindex = null;
let dodrawconn = false;

//sequnecing
let DO = true; 

//pict drawing
let drawnice = false;
let currtraj = [];
let STROKESTY = "black";
let STROWIDTH = 1;

//WEBAUDIO
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioctx;


//meidainput
navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
let dorecord = true;

//webmidi
let MIDIinputs = null;
let Midioutputs = null;

/*******************************************************************************

                               indexed DB related

*******************************************************************************/
let dbversion = 1;
let dbname = "NETSEQDB";


let myindexedDB = window.indexedDB || window.webkitIndexedDB || window.msIndexedDB || window.mozIndexedDB;

let IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange;
let openCopy = myindexedDB && myindexedDB.open;
 
let IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;
 
if (IDBTransaction)
{
    IDBTransaction.READ_WRITE = IDBTransaction.READ_WRITE || 'readwrite';
    IDBTransaction.READ_ONLY = IDBTransaction.READ_ONLY || 'readonly';
}

function createDB( name ){
    //Datenbank zur Speicherung der Werte der Audiodaten
	let dbrequest = myindexedDB.open( name, dbversion );
	
	dbrequest.onupgradeneeded = function( e ){
  		console.log( "Datenbank "+name+" angelegt." );
  		let ddbb = e.target.result;
  		if( !ddbb.objectStoreNames.contains( "AUDIOBUFFERFC" ) ){
    		let store = ddbb.createObjectStore( "AUDIOBUFFERFC", { keyPath: "seqname", autoIncrement: true } );
			let index = store.createIndex("seqIndex", "seqname", { "unique": true, multiEntry: false });
			console.log( "Tabelle AUDIOBUFFERFC angelegt.", index );
			//speichert POSNEGSCHW für jedes Bild
            store = null;
            index = null;
  		}
    }
    dbrequest.onsuccess = function( e ){
		console.log('Datenbank '+name+' geöffnet.');
        dbrequest = null;
	}

	dbrequest.onerror = function( e ){
		console.log('Datenbank '+name+' FEHLER ' + e);
        dbrequest = null;
	}
}

function writeTO( name, objstname, theobj ){
	let request = myindexedDB.open( name, dbversion );
	request.onsuccess = function(e){
    	let idb = e.target.result;
    	let trans = idb.transaction( objstname, IDBTransaction.READ_WRITE );
    	let store = trans.objectStore( objstname );
 
    	// add
    	let requestAdd = store.add( theobj );
 
    	requestAdd.onsuccess = function(e) {
			console.log("geschrieben ", name, objstname );
            idb = null;
            trans = null;
            store = null;
            requestAdd = null;
    	};
 
    	requestAdd.onfailure = function(e) {
        	console.log("nicht geschrieben ", name, objstname );
            idb = null;
            trans = null;
            store = null;
            requestAdd = null;
    	};
	};
}
let offsetaudiobuffer = 0;
function readFROM( name, objstname, theindex, dothis, withdata ){
	let request = myindexedDB.open( name, dbversion );
	request.onsuccess = function( e ){
		console.log( "Get from database: ", name, objstname, theindex );
    	let idb = e.target.result;
    	let transaction = idb.transaction( objstname, IDBTransaction.READ_ONLY );
   	 	let objectStore = transaction.objectStore( objstname );
 
		let cursor = IDBKeyRange.only( theindex );
    	objectStore.openCursor( cursor ).onsuccess = function( event ){
        	let cursor = event.target.result;
            request = null;
            objectStore = null;
            transaction = null;
            idb = null;
        	if( cursor ){
                offsetaudiobuffer = AUDIOBUFFERFC.length;
            	console.log('Daten vorhanden!' );
                for( let d in cursor.value.data ){
                    AUDIOBUFFERFC.push( cursor.value.data[d] );
                }
                dothis(withdata);
        	} else {
            	console.log('Keine Daten!');
        	}
    	};
	};
	request.onerror = function( e ){
		console.log('Keine Datenbank.');
        request = null;
	};
}

/******************************************************************************* 

                    HELPER FKT

*******************************************************************************/
function getpositiononpage( element ){
    if( element.nodeType ){
        var rect = element.getBoundingClientRect( );
        var elementLeft, elementTop; //x F y
        var scrollTop = document.documentElement.scrollTop ?
                        document.documentElement.scrollTop:document.body.scrollTop;
        var scrollLeft = document.documentElement.scrollLeft ?                   
                         document.documentElement.scrollLeft:document.body.scrollLeft;
        elementTop = rect.top+scrollTop;
        elementLeft = rect.left+scrollLeft;
        return [ elementTop, elementLeft ];
    } else {
        return false;
    }
}

function touchready( ){
    if( "ontouchstart" in window ){
        return true;
    }
    if( window.DocumentTouch && 
        document instanceof DocumentTouch ){
        return true;
    }

    return window.matchMedia( "(pointer: coarse)" ).matches;
}

function dodownit( contentof, nameoffile, type ){
    let af = new Blob( [ contentof ], {type: type} );
    let theIE = false || !!document.documentMode;
    if( theIE ){
        window.navigator.msSaveOrOpenBlob( af, nameoffile );
    } else {
        let alink = document.createElement( 'a' );
        alink.href = URL.createObjectURL( af );
        alink.download = nameoffile;
        document.body.appendChild( alink )
        alink.click( );
        document.body.removeChild( alink );
    }
}

function ab2str( buffer ) {
    //return String.fromCharCode.apply(null, new Uint8Array(buf));
    let binary = '';
    let bytes = new Uint8Array( buffer );
    let len = bytes.byteLength;
    for( let i = 0; i < len; i+=1 ){
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

function str2ab( base64 ) {
    let binary_string = window.atob( base64 );
    let len = binary_string.length;
    let bytes = new Uint8Array( len );
    for( let i = 0; i < len; i+=1 ){
        bytes[i] = binary_string.charCodeAt( i );
    }
    return bytes.buffer;
}

function parse_audiodesc(str) {
    return str.split( '&' ).reduce(
            function( params, param ){
                let paramSplit = param.split('=').map(function(value) {
                return decodeURIComponent(value.replace('+', ' '));
            });
            params[paramSplit[0]] = paramSplit[1];
            return params;
    }, {});
}

/*******************************************************************************

CONN AND FREEDBACK DRAW

*******************************************************************************/
function startconn( e ){
    fromindex = parseInt(e.target.name);
    touchx = olx;
    touchy = oly;
    olx = e.pageX;
    oly = e.pageY;
    
    console.log("from", fromindex, olx, oly); 
    
    //start drawing
    dodrawconn = true;
}

function endconn( e ){ 
    //console.log(e.pageX, e.pageY, e.screenX, e.screenY, e);
    let thereachedelem = document.elementFromPoint( e.pageX - window.pageXOffset, e.pageY-window.pageYOffset );
    //console.log( thereachedelem );
    toindex = parseInt(thereachedelem.name);
    console.log("to", toindex);
    if( INOUT[ fromindex ].indexOf( toindex ) === -1 ){
        INOUT[ fromindex ].push( toindex );
        if( MODUS[ fromindex ] === "switch" ){
            DARWINGS[ fromindex ][2] = INOUT[ fromindex ].length; //set how many
        }
    }
    if( e.target.parentNode.name === "sum" ){
        let count = 0;
        for( let i in INOUT ){
            if( INOUT[i].indexOf( toindex ) !== -1 ){
                count += 1;
            }
        }
        if( DARWINGS[ toindex ][2] < count ){
            //console.log("how many ins on sum", count, toindex, ACTIVEONES[ toindex ], DARWINGS[ toindex ][2]);
            ACTIVEONES[ toindex ] = count;
            DARWINGS[ toindex ][2] = count;
            e.target.parentNode.children[4].innerHTML = count;
        }
    } 
    if( MODUS[fromindex] === "stocha" ){
        let propa = prompt("Give a propability (0-100 %) to the output of the stochastic node: ");
        if( propa > 0 && propa <= 100 ){
            DARWINGS[ fromindex ][3].push( parseInt( propa ) );
            DARWINGS[ fromindex ][4].push( [] );
        }
        let fromnode = document.getElementById( (fromindex+1).toString() );
        fromnode.children[4].innerHTML = " " +DARWINGS[ fromindex ][3].join(", ");
        //console.log(DARWINGS[ fromindex ][3], fromnode)
    }
    
    dodrawconn = false;
    drawallconn();
}

function xconn( e ){
    INOUT[ parseInt(e.target.name) ] = [];
    if( e.target.parentNode.name == "stocha"){
        DARWINGS[ parseInt(e.target.name) ][3] = [];
        DARWINGS[ parseInt(e.target.name) ][4] = [];
    }
    drawallconn();
}

function drawAconn( e ){
    if( dodrawconn ){
        let x = Math.round(e.pageX);
        let y = Math.round(e.pageY);
        if( e.type === "touchmove" ||
            e.type === "touchstart"){
          x = Math.round(e.touches[0].clientX);
          y = Math.round(e.touches[0].clientY);
        } 
        
        connX.strokeStyle = linecolor;
        connX.lineWidth = 2;
        connX.beginPath();
        connX.moveTo( x, y ); 
        connX.lineTo( olx, oly );
        connX.stroke();
        connX.closePath();
        olx = x;
        oly = y;
    }
} 

function drawallconn( ){
    connX.clearRect(0, 0, WIDTH, HEIGHT);
    for( let ooo in INOUT ){
        if( INOUT[ ooo ].length !== 0 ){
            let sx = 0;
            let sy = 0;
            if( Array.isArray( DARWINGS[ ooo ] ) ){
                sx = DARWINGS[ ooo ][0];
                sy = DARWINGS[ ooo ][1];
            } else {
                sx = parseInt( DARWINGS[ ooo ].style.left.replace("px", "") );
                sy = parseInt( DARWINGS[ ooo ].style.top.replace("px", "") );
            }
            //active non active feedback
            let linw = 1;
            let colo = "#"+  Math.random().toString(16).substring(2, 8);//DARWINGS[ ooo ].type;//
            
            if( ACTIVEONES[ ooo ] === -1 ){ //hier noch das switch beinchen angeben
                connX.beginPath();
                connX.rect( sx, sy-maxnodemenlength, maxnodemenwidth+10+maxnodemenlength, maxnodemenlength*2.3 );
                /*if( MODUS[ ooo ] === 0 ){ //diffent feedback of differet modi
                    connX.rect( sx, sy-maxnodemenlength, maxnodemenwidth+10+maxnodemenlength, maxnodemenlength*2.5 );
                } else if( MODUS[ ooo ] === 1 ){
                    connX.rect( sx, sy, maxnodemenlength*2, maxnodemenwidth );
                } else {
                    connX.rect( sx, sy, maxnodemenwidth+50, maxnodemenlength*2 );
                }*/
                //connX.arc( sx, sy, 20, 0, 2 * Math.PI, false);
                
                    
                connX.fillStyle = colo;
                connX.fill();
                connX.closePath();
                linw = 15;
            } 
            
            let ollinew = linw;
            for( let zzz in INOUT[ ooo ] ){
                let kkk = INOUT[ ooo ][ zzz ];
        
                if( MODUS[ ooo ] === "switch" &&
                    parseInt( zzz ) === ACTIVEONES[ ooo ] ){
                    linw = 10;
                } else {
                    linw = ollinew;
                }
                let ex = 0;
                let ey = 0;
                let colozwei = colo;//DARWINGS[ kkk ].type;//
                if( Array.isArray( DARWINGS[ kkk ] ) ){
                    ex = DARWINGS[ kkk ][0];
                    ey = DARWINGS[ kkk ][1];
                } else {
                    //console.log(DARWINGS[ kkk ]);
                    ex = parseInt( DARWINGS[ kkk ].style.left.replace("px", "") );
                    ey = parseInt( DARWINGS[ kkk ].style.top.replace("px", "") );
                }
                if( ACTIVEONES[ kkk ] === -1 && kkk !== ooo){ //active
                    connX.beginPath();
                    //
                    connX.rect( ex, ey-maxnodemenlength, maxnodemenwidth+10+maxnodemenlength, maxnodemenlength*2.3 );
                    /*if( MODUS[ kkk ] === 0 ){ //diffent feedback of differet modi
                        connX.rect( ex, ey, 270, 35 );
                    } else if( MODUS[ kkk ] === 1 ){
                        connX.rect( ex, ey, 60, 65 );
                        //connX.arc(ex+outoffset, ey, 30, 0, 2 * Math.PI, false);
                    } else {
                        connX.rect( ex, ey, 35, 100 );
                    }*/
                    connX.fillStyle = colo;
                    connX.fill();
                    connX.closePath();
                } 
                /*connX.beginPath();
                connX.arc( sx, sy, 20, 0, 2 * Math.PI, false);
                connX.fillStyle = colo;
                connX.fill();
                connX.closePath();   */
                
                
                connX.strokeStyle = colo;
                connX.beginPath();
                connX.lineWidth = linw;
                //console.log(sx, ex, sy, ey )
                let rangesx = null;
                if( ex > sx ){
                    connX.moveTo( sx+outoffset, sy ); 
                    let dx = Math.round(Math.abs(ex-sx)/2);
                    let dy = Math.round(Math.abs(ey-sy)/2);
                    if(dx < 50){
                        dx = 50;
                    } 
                    if(dx > 200){
                        dx = 200;                        
                    }
                    if(dy < 50){
                        dy = 50;
                    } 
                    if(dy > 200){
                        dy = 200;                        
                    }
                    rangesx = sx-dx;
                    if( sy < ey ){
                        connX.lineTo( rangesx+outoffset, sy+dy );
                    } else {
                        connX.lineTo( rangesx+outoffset, ey+dy );
                    }
                    connX.lineTo( rangesx+outoffset, ey );
                    connX.lineTo( ex+inoffset, ey );

                } else {
                    connX.moveTo( sx+outoffset, sy );  
                    let d = Math.round((sx-ex));
                    if(d < 50){
                        d = 50;
                    } 
                    if(d > 200){
                        d = 200;
                    }
                    rangesx = ex-d;
                    connX.lineTo( rangesx+outoffset, sy+Math.round((ey-sy)/2) );
                    connX.lineTo( rangesx+outoffset, ey );
                    connX.lineTo( ex+inoffset, ey );
                }
                
                let parts = (ex-rangesx)/3;
                let pfsize = Math.round(maxnodemenlength/2);
                connX.moveTo( rangesx+(parts), ey );
                connX.lineTo( rangesx+(parts), ey-pfsize );
                connX.lineTo( rangesx+(2*parts), ey );
                connX.lineTo( rangesx+(parts), ey+pfsize );
                connX.lineTo( rangesx+(parts), ey );

                connX.moveTo( rangesx+(2*parts), ey );
                connX.lineTo( rangesx+(2*parts), ey-pfsize );
                connX.lineTo( rangesx+(3*parts), ey );
                connX.lineTo( rangesx+(2*parts), ey+pfsize );
                connX.lineTo( rangesx+(2*parts), ey );
                connX.stroke();
                connX.closePath();
                
                
            }  
        }
    }
}

/*******************************************************************************

PICT DRAW AND POINTER INTERACTION

*******************************************************************************/

//PREVENT REGULAR BEHAVIOR
//Safari and IE related
window.addEventListener( 'gesturestart', function( e ){
    e.preventDefault();
}, false);

window.addEventListener( 'gestureend', function( e ){
    e.preventDefault();
    if (e.scale < 1.0) {
        console.log(e.scale);
    } else if (e.scale > 1.0) {
        // User moved fingers further apart
        console.log(e.scale);
    }
}, false);

//context menu on long press
window.addEventListener( 'long-press', function( e ){
    e.preventDefault();
}, false);

window.oncontextmenu = function( e ){
        e.preventDefault();
        e.stopPropagation();
        return false;
};

let olddagevent = null;
function onpointerdownEventFkt( e ){
    //console.log(e.target, e.target.name, e);
    //disable default behavior but not for select elements
    if( e.target.nodeName !== "SELECT" ){
        e.preventDefault();
        e.stopPropagation(); 
        e.stopImmediatePropagation();
    }
    if( e.target.nodeName === "CANVAS" ){
        drawnice = true;
        let x = Math.round(e.pageX-parseInt(e.target.style.left.replace("px","")));
        let y = Math.round(e.pageY-parseInt(e.target.style.top.replace("px","")));
        currtraj.push([x,y]);
    } else if( e.target.draggable ){
        //console.log("dragstart", e);
        olddagevent = e;
    }
    
    if( e.target.innerHTML === "CO" ){
        startconn( e );
    }
}

function pointermoveEvfkt( e ){
    e.preventDefault();
    e.stopPropagation(); 
    e.stopImmediatePropagation();
    
    //draw on canvas of node
    if( e.target.nodeName === "CANVAS" ){
        if( drawnice ){
            let x = Math.round(e.pageX-parseInt(e.target.style.left.replace("px","")));
            let y = Math.round(e.pageY-parseInt(e.target.style.top.replace("px","")));
            let currx = e.target.getContext("2d");
            let ox = currtraj[currtraj.length-1][0];
            let oy = currtraj[currtraj.length-1][1];
            currx.strokeStyle = STROKESTY;
            currx.lineWidth = STROWIDTH;
            currx.lineCap = "round";
            currx.beginPath();
            
            currx.moveTo( x, y ); 
            currx.lineTo( ox, oy );
            currx.stroke();
            currx.closePath();
            currtraj.push([x,y]);
        }
    }

    //darw conn while connecting nodes
    drawAconn( e );
}

function onpointerupEventFkt( e ){
    e.preventDefault();
    e.stopPropagation(); 
    e.stopImmediatePropagation();
    //console.log(e.target, e.target.name, e);

    //drawing  canvas of node
    if( e.target.nodeName === "CANVAS" ){
        drawnice = false;
        let x = Math.round(e.pageX-parseInt(e.target.style.left.replace("px","")));
        let y = Math.round(e.pageY-parseInt(e.target.style.top.replace("px","")));
    
        currtraj.push([x,y]);
        //console.log(TRAJ, e.target.name);
        TRAJ[parseInt(e.target.name)].push( currtraj );
        currtraj = [];
    }  
    
    //dragging around
    if( olddagevent !== null ){
        //console.log("dragend", olddagevent);
        movearound( e, olddagevent );
        olddagevent = null;
    }
    if( e.target.innerHTML === "CO" ){
        //console.log(e);
        endconn( e );
    }
    //draw connection while connecting nodes
    if( dodrawconn ){ 
        dodrawconn = false; 
    }; 
}


function setTOEdit( e, index ){
    if( parseInt(DARWINGS[ index ].style.zIndex) === 10 ){
        DARWINGS[ index ].style.zIndex = 2;
        DARWINGS[ index ].style.transform = "scale(0.1)";
        e.target.style.background = "white";
        DARWINGS[ index ].style.opacity = 0.3;
        let notnot = document.getElementById("men"+DARWINGS[ index ].name);
        notnot.parentNode.removeChild( notnot );

        //ana( index ); //this will push to the anaArray, wich leads to the data that is send
    } else {
        DARWINGS[ index ].style.zIndex = 10;
        DARWINGS[ index ].style.transform = "scale(1.0)";
        e.target.style.background = "gray";
        DARWINGS[ index ].style.opacity = 1.0;

        drawingmodmenu( DARWINGS[ index ].style.left, DARWINGS[ index ].style.top, DARWINGS[ index ].name );
    }
}

/*******************************************************************************
   
 MIDI GENERAL SETTINGS AND FKT

*******************************************************************************/
/*MIDI globals*/
//NEUER STRANDRAD: POLYPHONE EXPRESSION (MPE)
const NOTE_ON_1 = 0x90;//channes 1
const NOTE_ON_2 = 0x91;//channes 2
const NOTE_ON_3 = 0x92;//channes 3
const NOTE_ON_4 = 0x93;//channes 4
const NOTE_ON_5 = 0x94;//channes 5
const NOTE_ON_6 = 0x95;//channes 6
const NOTE_ON_7 = 0x96;//channes 7
const NOTE_ON_8 = 0x97;//channes 8
const NOTE_ON_9 = 0x98;//channes 9
const NOTE_ON_10 = 0x99;//channes 10
const NOTE_ON_11 = 0x9A;//channes 11
const NOTE_ON_12 = 0x9B;//channes 12
const NOTE_ON_13 = 0x9C;//channes 13
const NOTE_ON_14 = 0x9D;//channes 14
const NOTE_ON_15 = 0x9E;//channes 15
const NOTE_ON_16 = 0x9F;//channes 16
const NOTE_ONS = [ [],
                   [NOTE_ON_1, NOTE_ON_2, NOTE_ON_3],
                   [NOTE_ON_4, NOTE_ON_5, NOTE_ON_6], 
                   [NOTE_ON_7, NOTE_ON_8, NOTE_ON_9], 
                   [NOTE_ON_10, NOTE_ON_11, NOTE_ON_12], 
                   [NOTE_ON_13, NOTE_ON_14, NOTE_ON_15], 
                   [NOTE_ON_16] ];
const NOTE_OFF_1 = 0x80;
const NOTE_OFF_2 = 0x81;
const NOTE_OFF_3 = 0x82;
const NOTE_OFF_4 = 0x83;
const NOTE_OFF_5 = 0x84;
const NOTE_OFF_6 = 0x85;
const NOTE_OFF_7 = 0x86;
const NOTE_OFF_8 = 0x87;
const NOTE_OFF_9 = 0x88;
const NOTE_OFF_10 = 0x89;
const NOTE_OFF_11 = 0x8A;
const NOTE_OFF_12 = 0x8B;
const NOTE_OFF_13 = 0x8C;
const NOTE_OFF_14 = 0x8D;
const NOTE_OFF_15 = 0x8E;
const NOTE_OFF_16 = 0x8F;
const NOTE_OFFS = [ [],
                    [NOTE_OFF_1, NOTE_OFF_2, NOTE_OFF_3], 
                    [NOTE_OFF_4, NOTE_OFF_5, NOTE_OFF_6], 
                    [NOTE_OFF_7, NOTE_OFF_8, NOTE_OFF_9], 
                    [NOTE_OFF_10, NOTE_OFF_11, NOTE_OFF_12], 
                    [NOTE_OFF_13, NOTE_OFF_14, NOTE_OFF_15], 
                    [NOTE_OFF_16] ];
const CHANNEL = [ [],
                    [1, 2, 3], 
                    [4, 5, 6], 
                    [7, 8, 9], 
                    [10, 11, 12], 
                    [13, 14, 15], 
                    [16] ];
const FULL_VEL = 127;//0x7f;
const ZERO_VEL = 0;//0x40;
const CHAN_AFTER_1 = 0xD0;
const CHAN_AFTER_2 = 0xD1;
const CHAN_AFTER_3 = 0xD2;
const CHAN_AFTER_4 = 0xD3;
const CHAN_AFTER_5 = 0xD4;
const CHAN_AFTER_6 = 0xD5;
const CHAN_AFTER_7 = 0xD6;
const CHAN_AFTER_8 = 0xD7;
const CHAN_AFTER_9 = 0xD8;
const CHAN_AFTER_10 = 0xD9;
const CHAN_AFTER_11 = 0xDA;
const CHAN_AFTER_12 = 0xDB;
const CHAN_AFTER_13 = 0xDC;
const CHAN_AFTER_14 = 0xDD;
const CHAN_AFTER_15 = 0xDE;
const CHAN_AFTER_16 = 0xDF;
const CHAN_AFTERS = [ [],
                    [CHAN_AFTER_1, CHAN_AFTER_2, CHAN_AFTER_3], 
                    [CHAN_AFTER_4, CHAN_AFTER_5, CHAN_AFTER_6], 
                    [CHAN_AFTER_7, CHAN_AFTER_8, CHAN_AFTER_9], 
                    [CHAN_AFTER_10, CHAN_AFTER_11, CHAN_AFTER_12], 
                    [CHAN_AFTER_13, CHAN_AFTER_14, CHAN_AFTER_15], 
                    [CHAN_AFTER_16] ];
const KEX_AFTER_1 = 0xA0;     
const KEX_AFTER_2 = 0xA1;
const KEX_AFTER_3 = 0xA2;
const KEX_AFTER_4 = 0xA3;
const KEX_AFTER_5 = 0xA4;
const KEX_AFTER_6 = 0xA5;
const KEX_AFTER_7 = 0xA6;
const KEX_AFTER_8 = 0xA7;
const KEX_AFTER_9 = 0xA8;
const KEX_AFTER_10 = 0xA9;
const KEX_AFTER_11 = 0xAA;
const KEX_AFTER_12 = 0xAB;
const KEX_AFTER_13 = 0xAC;
const KEX_AFTER_14 = 0xAD;
const KEX_AFTER_15 = 0xAE;
const KEX_AFTER_16 = 0xAF;
const KEX_AFTERS =  [ [],
                    [KEX_AFTER_1, KEX_AFTER_2, KEX_AFTER_3], 
                    [KEX_AFTER_4, KEX_AFTER_5, KEX_AFTER_6], 
                    [KEX_AFTER_7, KEX_AFTER_8, KEX_AFTER_9], 
                    [KEX_AFTER_10, KEX_AFTER_11, KEX_AFTER_12], 
                    [KEX_AFTER_13, KEX_AFTER_14, KEX_AFTER_15], 
                    [KEX_AFTER_16] ];
const PITCHBE_1 = 0xE0;
const PITCHBE_2 = 0xE1; 
const PITCHBE_3 = 0xE2; 
const PITCHBE_4 = 0xE3; 
const PITCHBE_5 = 0xE4; 
const PITCHBE_6 = 0xE5; 
const PITCHBE_7 = 0xE6; 
const PITCHBE_8 = 0xE7; 
const PITCHBE_9 = 0xE8; 
const PITCHBE_10 = 0xE9; 
const PITCHBE_11 = 0xEA; 
const PITCHBE_12 = 0xEB; 
const PITCHBE_13 = 0xEC; 
const PITCHBE_14 = 0xED; 
const PITCHBE_15 = 0xEE; 
const PITCHBE_16 = 0xEF; 
const PITCHBES =  [ [],
                    [PITCHBE_1, PITCHBE_2, PITCHBE_3], 
                    [PITCHBE_4, PITCHBE_5, PITCHBE_6], 
                    [PITCHBE_7, PITCHBE_8, PITCHBE_9], 
                    [PITCHBE_10, PITCHBE_11, PITCHBE_12], 
                    [PITCHBE_13, PITCHBE_14, PITCHBE_15], 
                    [PITCHBE_16] ];  
//MIDI NOTES AND EVENTS
let midiNotes = {
"gis’’’’’’": 128, 
"ges’’’’’’": 128,
"g’’’’’’":    127,	
"fis’’’’’’":  126,
"ges’’’’’’":  126,	
"f’’’’’’":    125,
"e’’’’’’":	  124,
"dis’’’’’’":   123,
"es’’’’’’":   123,	
"d’’’’’’":	  122,
"cis’’’’’’":  121, 
"des’’’’’’":  121,
"c’’’’’’": 120,
//
"h’’’’’": 119,
"ais’’’’’": 118,
"b’’’’’": 118,
"a’’’’’": 117,
"gis’’’’’":116,
"ges’’’’’":116,
"g’’’’’":115,
"fis’’’’’":114,
"ges’’’’’":114,
"f’’’’’":113,
"e’’’’’": 112,
"dis’’’’’":111,
"es’’’’’":111,
"d’’’’’":110,
"cis’’’’’":109,
"des’’’’’":109,
"c’’’’’":108,
//
"h’’’’":107,
"ais’’’’":106,
"b’’’’":106,
"a’’’’":105,
"gis’’’’":104,
"ges’’’’":104,
"g’’’’":103,
"fis’’’’":102, 
"ges’’’’":102,	
"f’’’’":101,	
"e’’’’":100,	
"dis’’’’":99,
"es’’’’":99,	
"d’’’’":98,
"cis’’’’":97,
"des’’’’":97,	
"c’’’’":96,
//
"h’’’":95,
"ais’’’":94,
"b’’’":94,
"a’’’":93,
"gis’’’":92,
"as’’’":92,
"g’’’":91,
"fis’’’":90,
"ges’’’":90,
"f’’’":89,
"e’’’":88,
"dis’’’":87,
"es’’’":87,
"d’’’":86,
"cis’’’":85,
"des’’’":85,
"c’’’":84,
//
"h’’":83,
"ais’’":82,
"b’’":82,
"a’’":81,
"gis’’":80,
"as’’":80,
"g’’":79,
"fis’’":78,
"ges’’":78,
"f’’":77,
"e’’":76,
"dis’’":75,
"es’’":75,
"d’’":74,
"cis’’":73,
"des’’":73,
"c’’":72,
//
"h’":71,
"ais’":70,
"b’":70,
"a’":69, 
"gis’":68,
"as’":68,
"g’":67,	
"fis’":66,
"ges’":66,
"f’":65,
"e’":64,	
"dis’":63,
"es’":64,
"d’":62,
"cis’":61,
"des’":61,
"c’":60,
//
"h":59,
"ais":58,
"b":58,
"a":57,
"gis":56,
"as":56,
"g":55,
"fis":54,
"ges":54,
"f":53,
"e":52,
"dis":51,
"es":51,
"d":50,
"cis":49,
"des":49,
"c":48,
//
"H":47,
"Ais":46,
"B":46,
"A":45,	
"Gis":44,
"As":44,
"G": 43,	
"Fis":42,
"Ges":42,	
"F":41,	
"E":40,	
"Dis":39,
"Es":39,
"D":38,	
"Cis":37,
"Des":37,
"C":36,
//
"H#":35,	
"Ais#":34,
"B#":34,	
"A#":33,	
"Gis#":32,
"As#":32,
"G#":31,	
"Fis#":30,
"Ges#":30,	
"F#":29,	
"E#":28,	
"Dis#":27,
"Es#":27,
"D#":26,	
"Cis#":25,
"Des#":25,
"C#":24,	
//
"H##":23,	
"Ais##":22,
"B##":22,	
"A##":21,
"Gis##":20,	
"As##":20,
"G##":19,
"Fis##":18,	
"Ges##":18,
"F##":17,	
"E##":16,
"Dis##":15,
"Es##":15,	
"D##":14,	
"Cis##":13,
"Des##":13,
"C##":12,
//	
"H###":11,
"Ais###":10,	
"B###":10,	
"A###":9,	
"Gis###":8,
"As###":8,	
"G###":7,	
"Fis###":6,
"Ges###":6,
"F###":5,	
"E###":4,
"Dis###":4,
"Es###":3,
"D###":2,
"Cis###":1, 
"Des###":1,
"C###":0	
//
};

function midimassage( m, mode, chanoff, ch, n, vel ){ //midimassage-> m=on/off, mode=note/adtert/pibend, chanoff=1-6, ch=0-2, n=0-128, vel=0-128
    for( let out of Midioutputs.values( ) ){
        //console.log(out);
        if( m === "on" ){
            if( mode === "note" ){
                // note on
                console.log("on");
                out.send( [ NOTE_ONS[ parseInt( chanoff) ][ parseInt(ch) ], parseInt( n ), parseInt(vel)] );
            } else if(  mode === "aftert" ){
                //send Aftertouch per channel 
                out.send( [CHAN_AFTERS[ chanoff ][ ch ], n] );
            } else if(  mode === "pibend" ){
                //send Pitch Bend per channel
                let valv1 = parseInt( (16384 * n )/ 128 );
                let be1 = valv1&127;
                let be2 = valv1>>7;
                out.send( [PITCHBES[ chanoff ][ ch ], be1, be2] );
            } 
        } else {
            // note on
            console.log("off");
            out.send( [ NOTE_OFFS[ parseInt(chanoff) ][ parseInt(ch) ], parseInt( n ), ZERO_VEL]);
        }
        
        
    }
}

function onMIDISuccess( midi ) {
    console.log('WebMIDI supported!', midi );
    MIDIinputs = midi.inputs;
    Midioutputs = midi.outputs;
}

function onMIDIFailure( ){
    console.log('No WebMidi No Fun');
}

function getMIDIMessage( midiMessage ) {
 
}

function midiInit( ){ //...
    if( window.navigator.requestMIDIAccess ){
        let midi = window.navigator.requestMIDIAccess().then( onMIDISuccess, onMIDIFailure );
    } else {
        alert("NO WEBmidi NO fun. Update Browser.");
        console.log("NO MIDI NO FUN");
    }
}

/*******************************************************************************

    IMAGE PROCESSING AND ANALYSIS

*******************************************************************************/
//from trajectoriy
//distribution of devided trajectory parts
//speed
//distance

//from componnets
//relatedness
//center of weight, center of box
//eukleadean curvature
//ricci curvature

function ana( anodeindex ){

}

/*******************************************************************************

    Audio Processing / Audio File

*******************************************************************************/
//other audio file is in insertNode fkt

function streamtobuffer( astream ){
    //hear it
    /*let gainnode = audioctx.createGain();
    gainnode.connect( audioctx.destination );

    let microphonestream = audioctx.createMediaStreamSource( astream );
    microphonestream.connect(gainnode); 
    //how to close this ?
    */
    //record it
    let theRecorder = new MediaRecorder( astream );
    let recchunks = [];
    theRecorder.ondataavailable = event => recchunks.push( event.data );
    theRecorder.onstop = function( e ){
        //AUDIOBUFFERFC.push( recchunks );
        let outputblob = new Blob( recchunks, { 'type' : 'audio/ogg; codecs=opus' } );
        
        outputblob.arrayBuffer().then( theArrayBuffer => {
            //
            AUDIOBUFFERFC.push( ab2str(theArrayBuffer) );
            
            audioctx.decodeAudioData( theArrayBuffer ).then( function( decodedData ) {
                AUDIOBUFFER.push( decodedData );
                let source = audioctx.createBufferSource( );
                source.buffer = decodedData;
                source.connect( audioctx.destination );
                let aname = prompt("Give a name to the recording ");
                let lab = aname + " ("+ Math.floor(source.buffer.duration*1000).toString() +")";
                DARWINGS.push( [CADDX, CADDY, source, AUDIOBUFFER.length-1, lab] );
                DURATIONS.push( source.buffer.duration*1000 ); //time of sound file
                TRAJ.push([]);
                ACTIVEONES.push( -2 );
                MODUS.push("audiofile");

                
                insertTHEnodeStuff( CADDX, CADDY, lab); 
            });
        });
    };
    theRecorder.start( );
    
    let m13 = document.createElement( "input" );
    m13.style.fontSize = "400%";
    m13.style.position = "absolute";
    let ih = (window.innerHeight || document.documentElement.clientHeight);
    let iw = (window.innerWidth || document.documentElement.clientWidth);
    let oh = (window.pageYOffset || document.documentElement.pageYOffset);
    let ow = (window.pageXOffset || document.documentElement.pageXOffset);
    m13.style.left = (((iw/2)-100)+ow).toString()+"px";
    m13.style.top = (((ih/2)-30)+oh).toString()+"px";
    m13.style.zIndex = "100";
    m13.value = "Stop Rec!";
    m13.type = "Button";
    m13.className = "mainmenent";
    m13.onclick = function(){ this.parentNode.removeChild( this  ); theRecorder.stop( );  };
    document.body.appendChild( m13 );
}

/*******************************************************************************

    SEQUNECING THE NETWORK

*******************************************************************************/
function deactivate( index ){
    console.log("deactivate", index, ACTIVEONES[index], MODUS[ index ]);
    if( MODUS[ index ] === "sum" ){
        ACTIVEONES[ index ] = DARWINGS[ index ][2];
        console.log("how many", ACTIVEONES[ index ], "toindex", index);
    } else if( MODUS[ index ] === "switch" ){
        ACTIVEONES[ index ] += 1;
        if( DARWINGS[ index ][2] === ACTIVEONES[ index ] ){
            ACTIVEONES[ index ] = 0;
        }
        //console.log("how many", ACTIVEONES[ index ], "toindex", index);
    } else {
        ACTIVEONES[index] = -2;
    }
    
    if( MODUS[ index ] === "audiofile" ){
        let source = audioctx.createBufferSource( );
        source.buffer = AUDIOBUFFER[ DARWINGS[ index ][3] ];
        source.connect( audioctx.destination );
        DARWINGS[ index ][2] = source;
    } else if( MODUS[ index ] === "midimag" ){
        midimassage(
            "off", //m=on/off
            DARWINGS[ index ][3], //mode=note/adtert/pibend
            DARWINGS[ index ][4], //chanoff=1-6
            DARWINGS[ index ][5], //ch=0-2
            DARWINGS[ index ][6], //n=0-128
            DARWINGS[ index ][7], //vel=0-128
        );
    }
    drawallconn( );
}

function activate( index ){
    console.log("activate", index, ACTIVEONES[index], MODUS[ index ] );
    if( DO ){
        let durofthis = DURATIONS[ index ];
        if( ACTIVEONES[index] === -3 && ( MODUS[ index ] !== "sum"  || MODUS[ index ] !== "switch" ) ){
            //console.log("muted");
            durofthis = 0;
        } else {
            if( ACTIVEONES[index] !== -1 ){ //no double activation if active let it like it is
                let realy = true;
                if( MODUS[ index ] === "audiofile" ){//is audionode
                    DARWINGS[ index ][2].start(0);
                } 

                if( MODUS[ index ] === "url" ){//is audionode
                    DARWINGS[ index ][2].play();
                } 
                
                if( MODUS[ index ] === "midimag" ){
                    midimassage(
                        "on", //m=on/off
                        DARWINGS[ index ][3], //mode=note/adtert/pibend
                        DARWINGS[ index ][4], //chanoff=1-6
                        DARWINGS[ index ][5], //ch=0-2
                        DARWINGS[ index ][6], //n=0-128
                        DARWINGS[ index ][7], //vel=0-128
                    );
                }
                
                if( MODUS[ index ] === "sum" ){ //sum node
                    ACTIVEONES[index] = ACTIVEONES[index]-1;
                    console.log( MODUS[ index ], ACTIVEONES[index]);
                    if( ACTIVEONES[index] !== 0 ){
                        realy = false;
                    }
                } 

                

                if( realy ){
                    //console.log("Realy", index, ACTIVEONES[index], MODUS[ index ], durofthis);
                    if( MODUS[ index ] === "stocha" ){   
                        //console.log("stocha active");   
                        // markov cov
                        // aktuelle Ausprägung der bedingten Wahrscheinlichkeiten
                        let cuurrbedwahrsch = []
                        let ttt = (Math.floor(Math.random() * 10)+1)*10; //würfeln
                        for( let trans in DARWINGS[ index ][4] ){
                            let tttt = ttt;
                            for( let val in DARWINGS[ index ][4][trans] ){
                                tttt += DARWINGS[ index ][4][trans][val];
                            }
                            tttt = tttt/(DARWINGS[ index ][4][trans].length+1);
                            cuurrbedwahrsch.push(tttt);
                        }  
                        //console.log(ttt, cuurrbedwahrsch, DARWINGS[ index ][4]);
                        // abgleich mit den gegeben wahrscheinlichkeiten
                        let maxtotake = 0;
                        let indexatmax = null;
                        for( let b in cuurrbedwahrsch ){
                            //if( cuurrbedwahrsch[ b ] <= DARWINGS[ index ][ 3 ][ b ] ){
                                //connection takable
                                //console.log("connection takable to: ", b, DARWINGS[ index ][ 3 ][ b ] - cuurrbedwahrsch[ b ] );
                                if( maxtotake <= Math.abs(DARWINGS[ index ][ 3 ][ b ] - cuurrbedwahrsch[ b ]) ){
                                    maxtotake = DARWINGS[ index ][ 3 ][ b ] - cuurrbedwahrsch[ b ];
                                    indexatmax = b;
                                }
                            //} 
                        }      
                        if(indexatmax != null){
                            DARWINGS[ index ][4][indexatmax].push( ttt ); //this is growing infinitivly - FIX length of array
                            //console.log("take connection to ", indexatmax, INOUT[index], INOUT[index][indexatmax], );
                            setTimeout( function(){ activate( INOUT[index][indexatmax] ); } , durofthis+1); 
                        }
                        setTimeout( function(){ deactivate( index ); } , durofthis);
                    } else if( MODUS[ index ] === "switch" ){
                        //console.log("switch on now", INOUT[index][ ACTIVEONES[ index ] ] );
                        setTimeout( function(){ activate( INOUT[index][ ACTIVEONES[ index ] ] ); } , durofthis+1); 
                        setTimeout( function(){ deactivate( index ); } , durofthis);
                    } else {
                        ACTIVEONES[ index ] = -1;
                        for( let i in INOUT[index] ){ //move this outside of this if and keep the propagation of action
                            setTimeout( function(){ activate( INOUT[index][ i ] ); } , durofthis+1); //after the amount of time the node durates activate the next in millisecs
                        }
                        setTimeout(function(){ deactivate( index ); } , durofthis);
                    }
                }
                drawallconn();
            } 
        } 
    } else {
        let count = 0;
        for( let a in ACTIVEONES ){
            if( ACTIVEONES[a] === -2 ){
                count += 1;
            }
        }
        //console.log(count, ACTIVEONES.length-1);
        if( count === ACTIVEONES.length-1 ){
            DO = true;
        }
    }
}


/*******************************************************************************

    MENU INTERACTION

*******************************************************************************/

//fkt emitted by the menu of the nodes ....
let dialogresult = null;
function askastringnumber( anzeige, cbf ){
    dialogresult = null;
    let mainelm = document.createElement( "div" );  
    mainelm.innerHTML = anzeige;  
    mainelm.style.position = "absolute";
    mainelm.id = "entersomething";
    mainelm.style.background = "#"+  Math.random().toString(16).substring(2, 8);
    mainelm.style.left = window.pageXOffset.toString() +"px";
    mainelm.style.top = window.pageYOffset.toString() +"px";
    mainelm.style.zIndex = 6;
    mainelm.style.padding = "5px";

    let inp = document.createElement( "input" ); 
    inp.id = "inputtt";
    inp.display = "block";
    mainelm.appendChild( inp );

    let signs = ["b","c","d","f","g","h","j","k","l","m","n","p","q","r","s","t","u","v","w","x","y","z","0","1","2","3","4","5","6","7","8","9"];
    for( let s in signs ){
        let si = document.createElement( "span" );  
        si.style.border = "1px solid black";
        si.style.margin = "2px";
        si.style.padding = "1%";
        si.style.cursor = "pointer";
        si.style.display = "inline-block";
        si.style.background = "#"+  Math.random().toString(16).substring(2, 8);
        si.innerHTML = signs[s];
        si.name = signs[s];
        si.onclick = function( ){ document.getElementById( "inputtt" ).value += this.name };
        mainelm.appendChild( si )
    }
    let done = document.createElement( "span" );
    done.style.border = "1px solid black";
    done.style.margin = "2px";
    done.style.padding = "1%";
    done.style.cursor = "pointer";
    done.style.display = "inline-block";
    done.style.background = "white";
    done.innerHTML = "OK";
    done.onclick = function( ){cbf( document.getElementById( "inputtt" ).value); document.body.removeChild( document.getElementById( "entersomething" ))};
    mainelm.appendChild( done );
    document.body.appendChild( mainelm );
    inp.focus();
}


function setDur( elem ){
    let index = parseInt( elem.name );
    let callback = function( temdur ){ //prompt("New Duration in msec: ");
        //console.log(, "temdur", index );
        temdur = parseInt(temdur);
        if( temdur && temdur !== "" && temdur != NaN ){
            DURATIONS[index] = temdur;
            elem.parentNode.children[elem.parentNode.children.length-1].innerHTML = " "+ temdur.toString( );
        }
    }
    askastringnumber("New Duration in msec: ", callback);
}

function setCount( elem ){
    let index = parseInt( elem.name );
    let callback = function( temdur ){ 
        temdur = parseInt(temdur);
        if( temdur && temdur !== "" && temdur != NaN ){
            DARWINGS[index][2] = temdur;
            elem.parentNode.children[elem.parentNode.children.length-3].innerHTML = " "+temdur.toString();
        }
    }
    askastringnumber("New Count: ", callback);
}

function setMO( index ){
    let callback = function( temmo ){ 
        temmo = parseInt(temmo);
        if( temmo && temmo !== "" && temmo !== NaN ){
            MODUS[index] = temmo;
        }
    }
    askastringnumber( "Give Modus of node (0: ..., 1:..., 2:... ): ", callback );
}

function toggelseqJESNO( e ){
    if( DO ){
        DO = false;
    } else {
        DO = true;
    }
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function doconniofkreuz( ){
    let checks = document.getElementsByClassName( "kreuzies" );
    
    for( let c in checks ){
        if( checks[c].name == 0 && checks[c].checked ){
            let fiti = checks[c].id.split(",");
            let fi = parseInt( fiti[0] );
            let ti = parseInt( fiti[1] );
            console.log("verbinde neu from ", fi, " to ", ti );
            conntwonodes( fi, ti );
            
        } else if (checks[c].name == 1 && !checks[c].checked ){
            let fiti = checks[c].id.split(",");
            let fi = parseInt( fiti[0] );
            let ti = parseInt( fiti[1] );
            console.log("delet verbindung from", fi, " to ", ti);
            deledgeone( fi, ti );
            
        }
    }
    let kk = document.getElementById( "kreuzschiene" );
    kk.parentNode.removeChild( kk );
}

function kreuzschiene( e ){
    CADDX = e.pageX;
    CADDY = e.pageY;
    let topup = document.createElement( "div" );
    topup.className = "kreuzschiene";
    topup.id = "kreuzschiene";
    topup.style.left = CADDX.toString()+"px";
    topup.style.top = CADDY.toString()+"px";
    topup.style.background = "#"+  Math.random().toString(16).substring(2, 8);
    for( let i = 0; i < DARWINGS.length; i+=1 ){
        if( ACTIVEONES[ i ] !== -4 ){
            let k = document.createElement( "div" );
            for( let j = 0; j < DARWINGS.length; j+=1 ){
                if( ACTIVEONES[ i ] !== -4 && ACTIVEONES[ j ] !== -4 ){
                    let g = document.createElement( "span" );
                    g.innerHTML = (i+1).toString() +"&gt;&gt;"+ (j+1).toString()+": ";
                    let h = document.createElement( "input" );
                    h.type = "checkbox";
                    h.checked = false;
                    h.name = 0;
                    h.className = "kreuzies";
                    h.id = i.toString( )+","+j.toString( );
                    if( INOUT[ i ].indexOf( j ) != -1 ){
                        h.checked = true;
                        h.name = 1;
                        console.log("one checked");
                    }
                    g.appendChild( h );
                    k.appendChild( g );
                }
            }
            topup.appendChild( k );
        }
    }

    let xx = document.createElement( "input" );
    xx.value = "Do!";
    xx.type = "Button";
    xx.onclick = function(){ doconniofkreuz( ); };
    topup.appendChild(xx);
    document.body.appendChild( topup );
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}


function conntwonodes( fi, ti ){
    //let fromnodenum = prompt("FROM node number: ");
    let fromelm = document.getElementById( (fi+1).toString() ).children[1];
    //fromelm.style.background = "blue";
    //let tonodenum = prompt("TO node number: ");
    let toelm = document.getElementById( (ti+1).toString() ).children[1];
    //toelm.style.background = "blue";
    
    let evtd = document.createEvent('Event');
    evtd.initEvent('pointerdown', true, true); 
    let downpos = getpositiononpage( fromelm );
    evtd.pageX = downpos[1]+2;
    evtd.pageY = downpos[0]+2;
    fromelm.dispatchEvent( evtd);
    let evtu = document.createEvent('Event');
    evtu.initEvent('pointerup', true, true); 
    let uppos = getpositiononpage( toelm );
    evtu.pageX = uppos[1]+2;
    evtu.pageY = uppos[0]+2;
    toelm.dispatchEvent( evtu );
    //e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function deledge( e ){
    let nodenum = prompt("Delete outgoing edges on node: ");
    let delelm = document.getElementById( nodenum ).children[2];
    let evtu = document.createEvent('Event');
    evtu.initEvent('pointerup', true, true); 
    let uppos = getpositiononpage( delelm );
    evtu.pageX = uppos[1]+1;
    evtu.pageY = uppos[0]+1;
    delelm.dispatchEvent( evtu );
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function deledgeone( fromindex, toindex ){
    //let fromnodenum = prompt("FROM node number: ");
    //let fromindex = fromnodenum-1;
    
    //let tonodenum = prompt("TO node number: ");
    //let toindex = tonodenum-1;

    let newone = [];
    let newo = [];
    let newoo = []
    for( let j in INOUT[ fromindex ] ){
        if( INOUT[ fromindex ][ j ] != toindex ){
            newone.push( INOUT[ fromindex ][ j ] );
            if( MODUS[fromindex] == "stocha" ){
                newo.push( DARWINGS[ fromindex ][3][j]);
                newoo.push( DARWINGS[ fromindex ][4][j]);
            }
        }
    }
    INOUT[ fromindex ] = newone;
    if( MODUS[fromindex] == "stocha" ){
        DARWINGS[ fromindex ][3] = newo;
        DARWINGS[ fromindex ][4] = newoo;
    }
    

    drawallconn(); 
}

function delnode( e, nodenum ){
    if( nodenum === undefined ){
        nodenum = prompt("Delete node: ");
    }
    let todelelem = document.getElementById( nodenum );
    todelelem.style.display = "none";
    
    //hide elem and delete all edges from it and to it
    let dataindex = parseInt(todelelem.children[1].name);
    if( !Array.isArray( DARWINGS[ dataindex ] ) ){
        DARWINGS[ dataindex ].style.display = "none";
    }
    ACTIVEONES[ dataindex ] = -4; //mark as deleted node
    INOUT[ dataindex ] = [];
    for( let io in INOUT ){
        if( INOUT[ io ].length != 0){
            console.log(dataindex, INOUT[ io])
            if( INOUT[ io].indexOf( dataindex ) != -1 ){
                console.log(INOUT[ io])
                let newone = [];
                for( let j in INOUT[ io ] ){
                    if( INOUT[ io ][ j ] != dataindex ){
                        newone.push( INOUT[ io ][ j ] );
                    }
                }
                INOUT[ io ] = newone;
            }
        }
    }
    drawallconn(); 
    if(e !== undefined ){   
        e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
    }
}

function posnode( e, xx, yy ){
    let nodenum = prompt("Move node: ");
    let draelm = document.getElementById( nodenum ).children[0];
    let evtd = document.createEvent('Event');
    evtd.initEvent('pointerdown', true, true); 
    let downpos = getpositiononpage( draelm );
    evtd.pageX = xx;//downpos[1];
    evtd.pageY = yy;//downpos[0];
    draelm.dispatchEvent( evtd );
    let evtu = document.createEvent('Event');
    evtu.initEvent('pointerup', true, true); 
    evtu.pageX = xx;//e.pageX;
    evtu.pageY = yy;//e.pageY;
    draelm.dispatchEvent( evtu );
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function integupload( allarr ){
    let indexoffset = parseInt( JSON.parse( JSON.stringify( ACTIVEONES.length ) ) );
    console.log("indexoffset", indexoffset, ACTIVEONES);
    if( WIDTH < allarr[0] ){
        WIDTH = allarr[0];
        HEIGHT = allarr[0];
        document.body.width = WIDTH;
        document.body.height = HEIGHT;
        document.body.style.width = WIDTH.toString()+"px";
        document.body.style.height = HEIGHT.toString()+"px";
        let edelem = document.getElementById("edges");
        edelem.width = WIDTH;
        edelem.height = HEIGHT;
        edelem.style.width = WIDTH.toString()+"px";
        edelem.style.height = HEIGHT.toString()+"px";
        let noelem = document.getElementById("nodesdrawbackground");
        noelem.width = WIDTH;
        noelem.height = HEIGHT;
        noelem.style.width = WIDTH.toString()+"px";
        noelem.style.height = HEIGHT.toString()+"px";
        let inelem = document.getElementById("nodesinteract");
        inelem.width = WIDTH;
        inelem.height = HEIGHT;
        inelem.style.width = WIDTH.toString()+"px";
        inelem.style.height = HEIGHT.toString()+"px";
    }
    let dw = allarr[2];
    let dh = allarr[3];
    
    
    //console.log("Allpos:", allarr[4]);
    for( let r in allarr[4] ){ //positions and data
        lock = false;
        //add menu
        //add pict and pict data
        //console.log("position ", r, allarr[4][r][0], allarr[4][r][1], allarr[7][r]);
        r = parseInt(r);
        //DARWINGS call fkt drawingsdata ; allarr[5][r]//5
        //outdata.push( TRAJ );allarr[6][r]//6
        //outdata.push( MODUS );allarr[7][r]//7
        //outdata.push( DURATIONS )allarr[8][r];
        //outdata.push( INOUT )allarr[9][r];
        //BUFFERS allarr[10][r];
        for( let v in allarr[9][r] ){ //reset indices of connections
            //console.log("formerto", typeof allarr[9][r][v], parseInt( allarr[9][r][v]), typeof parseInt(allarr[9][r][v]));
            allarr[9][r][v] = parseInt(allarr[9][r][v]) + indexoffset;
            //console.log("newto", allarr[9][r][v]);
        }
        

        if( allarr[7][r] === 0 || allarr[7][r] === 1 || allarr[7][r] === 2 ){
            //replace old index with new index just add the lengst of the
            //[dw dh], [px py],  TRAJ, MODUS, DURATIONS, INOUT, PIC
            
            insertAnodedraw([ [dw,dh], 
                              [allarr[4][r][0], allarr[4][r][1]], 
                                allarr[6][r],
                                allarr[7][r], 
                                allarr[8][r], 
                                allarr[9][r], 
                                allarr[5][r] ]);
            insertAnodemenu( );
        } else {
            if( allarr[7][r] === "audiofile" ){
                lock = true;
                
                for( let v in allarr[5][r] ){ //reset indices of audiobuffer
                    allarr[5][r][v] += offsetaudiobuffer;
                }
                //console.log( allarr[5][r][3], AUDIOBUFFERFC.length, AUDIOBUFFERFC[ allarr[5][r][3] ], AUDIOBUFFERFC);
                await audioctx.decodeAudioData( str2ab( AUDIOBUFFERFC[ allarr[5][r][3] ] ) ).then( function( decodedData ) {
                     //data and audio api section
                    AUDIOBUFFER.push( decodedData );
                    let source = audioctx.createBufferSource( );
                    source.buffer = decodedData;
                    source.connect( audioctx.destination );
                    CADDX = allarr[5][r][0];
                    CADDY = allarr[5][r][1];
                    DARWINGS.push( [CADDX, CADDY, source, AUDIOBUFFER.length-1, allarr[5][r][4]] );
                    
                    DURATIONS.push( allarr[8][r] ); //time of sound file
                    TRAJ.push( allarr[6][r] );
                    ACTIVEONES.push( -2 );
                    MODUS.push( allarr[7][r] );
                    let thisindexis = r+indexoffset;
                    //console.log("Au", r, thisindexis, allarr[9][r], CADDX, CADDY, allarr[5][r][4]);
                    for( let i in allarr[9][r] ){
                        console.log("conn", thisindexis, allarr[9][r][i]);
                        INOUT[ thisindexis ].push( allarr[9][r][i] );
                    }
                    insertTHEnodeStuff( CADDX, CADDY, allarr[5][r][4]);
                    lock = false;
                 });
                 
                
            } else if( allarr[7][r] ===  "split" || allarr[7][r] === "sum" || allarr[7][r] === "switch" || allarr[7][r] === "stocha"  ){
                CADDX = allarr[5][r][0];
                CADDY = allarr[5][r][1];
                TRAJ.push( allarr[6][r] );
                DARWINGS.push( allarr[5][r] );
                if(allarr[7][r] === "sum" || allarr[7][r] === "switch"){
                    ACTIVEONES.push( allarr[10][r] );
                } else {
                    ACTIVEONES.push( -2 );
                }
                DURATIONS.push( allarr[8][r] );
                MODUS.push( allarr[7][r] );
                let thisindexis = r+indexoffset;
                //console.log("SpSU", r, thisindexis, allarr[9][r], CADDX, CADDY);
                for( let i in allarr[9][r] ){
                    console.log("conn", thisindexis, allarr[9][r][i]);
                    INOUT[ thisindexis ].push( allarr[9][r][i] );
                }
                if( allarr[7][r] === "split" ){
                    arithnode(CADDX, CADDY, "split");
                } else if( allarr[7][r] === "sum" ){
                    arithnode(CADDX, CADDY, "sum");
                } else if( allarr[7][r] === "stocha" ){
                    arithnode(CADDX, CADDY, "stocha");
                } else {
                    arithnode(CADDX, CADDY, "switch");
                }
            } else if( allarr[7][r] === "midimag" ){
                CADDX = allarr[5][r][0];
                CADDY = allarr[5][r][1];
                TRAJ.push( allarr[6][r] );
                DARWINGS.push( allarr[5][r] );
                ACTIVEONES.push( allarr[10][r] );
                DURATIONS.push( allarr[8][r] );
                MODUS.push( allarr[7][r] );
                let thisindexis = r+indexoffset;
                //console.log("SpSU", r, thisindexis, allarr[9][r], CADDX, CADDY);
                for( let i in allarr[9][r] ){
                    console.log("conn", thisindexis, allarr[9][r][i]);
                    INOUT[ thisindexis ].push( allarr[9][r][i] );
                }
                buildmidiMen();

            } else if( allarr[7][r] === "url" ){

                let aufromvidid = buildaudioelemfromYTvideoID( allarr[5][r][3], allarr[5][r][4], allarr[5][r][0], allarr[5][r][1] );
                
                if( aufromvidid !== null ){ // is this working????
                    let thisindexis = r+indexoffset;
                    for( let i in allarr[9][r] ){
                        console.log("conn", thisindexis, allarr[9][r][i]);
                        INOUT[ thisindexis ].push( allarr[9][r][i] );
                    }
                }
            } else {
                console.log("unknown node type in upload!!!!")
            }
            //console.log(allarr);
        }
        while( lock ){
            await Sleep(100);
        }
    }
}

function nonedone( e ){
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function savetolocal( e ){
    //frag name und speichere darunter
    let nana = prompt("Name for snapshot:");
    if( nana && nana !== "" ){
        localStorage.setItem( nana+".netseq", prepdataforsave() );     
        writeTO( dbname, "AUDIOBUFFERFC", {"data": AUDIOBUFFERFC, "seqname": nana+".netseq"} );  
    }
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function openfromlocal( e ){
    //gib liste und selectiere eines
    let noi = "Open: ";
    for( let t = 0; t < localStorage.length; t+=1 ){
        let g = localStorage.key( t );
        if( g.indexOf( ".netseq" ) !== -1 ){
            noi += g + ",     ";
        }
    }
    let opname = prompt(noi);
    if( opname && opname !== "" ){
        readFROM( dbname, "AUDIOBUFFERFC", opname, integupload, JSON.parse( localStorage.getItem( opname ) ) );
    }
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function prepdataforsave( ){
    //sizes müssen mit gespeichert werden
    //given WIDTH and HEIGHT
    let outdata = [WIDTH, HEIGHT]; //0, 1

    //page size - Draw area size -- otherwise glob size
    if(Array.isArray( DARWINGS[ 0 ] )){
        let w = WIDTH;
        let h = HEIGHT;
        for(let f in DARWINGS){
            if( !Array.isArray( DARWINGS[ f ] ) ){
                w = DARWINGS[0].width;
                h = DARWINGS[0].height;
                break;
            }
        }
        outdata.push( w ); //2
        outdata.push( h ); //3
    } else {
        outdata.push( DARWINGS[0].width ); //2
        outdata.push( DARWINGS[0].height ); //3
    }  

    //position
    let POS = [];
    for(let f in DARWINGS){
        if( Array.isArray( DARWINGS[ f ] ) ){
            POS.push( [parseInt(DARWINGS[f][0]), parseInt(DARWINGS[f][1])] );
        } else {
            POS.push( [parseInt(DARWINGS[f].style.left.replace("px","")), parseInt(DARWINGS[f].style.top.replace("px","")) ]);
        }
    }
    outdata.push( POS ); //4

    //
    let drawingsdata = [];
    for( let z in DARWINGS ){
        if( Array.isArray( DARWINGS[ z ] ) ){
            //console.log(DARWINGS[z]);
            drawingsdata.push( DARWINGS[z] );
        } else {
            drawingsdata.push( DARWINGS[z].toDataURL( ) );
        }
    }
    outdata.push( drawingsdata ); //5
    outdata.push( TRAJ );//6
    outdata.push( MODUS );//7
    outdata.push( DURATIONS ); //8
    outdata.push( INOUT ); //9
    //console.log( ACTIVEONES );
    outdata.push( ACTIVEONES );//10 - AudioBuffer


    return JSON.stringify( outdata );
}

function uploadas( elem ){
    let uu = elem.files[0];
    elem.parentNode.parentNode.removeChild( elem.parentNode  );
    var reader = new FileReader();
    reader.onload = function(e) {
        let allarr = JSON.parse( reader.result );
        localStorage.setItem( allarr.downloadname, allarr.localStorage );    
        // writeTO( dbname, "AUDIOBUFFERFC", {"data": AUDIOBUFFERFC, "seqname": nana+".netseq"} );
        console.log(allarr.AUDIOBUFFERFC.data, allarr.AUDIOBUFFERFC.seqname)
        writeTO( dbname, "AUDIOBUFFERFC", { "data": allarr.AUDIOBUFFERFC.data, "seqname": allarr.AUDIOBUFFERFC.seqname} );
        let ttt = localStorage.getItem( allarr.downloadname );
        readFROM( dbname, "AUDIOBUFFERFC", allarr.downloadname, integupload, JSON.parse( ttt ) );
	}
    reader.readAsText( uu );
}

function downas( e ){
    let nana = prompt("Name for download:");
    if( nana && nana !== "" ){
        dodownit( JSON.stringify({ downloadname: nana+".netseq", 
                                   localStorage: prepdataforsave(), 
                                   AUDIOBUFFERFC: { data:  AUDIOBUFFERFC, seqname: nana+".netseq" } 
                                 }) , nana+".netseq",  "application/json");     
          
    }
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );   
}

function emittAction( index ){
    //console.log("emit from node no ", index );
    //console.log("emit to", INOUT[index].toString());
    activate( index );
}

function munode( e ){
    let onelem = event.target || event.srcElement;
    if( ACTIVEONES[onelem.name] === -3 ){
        ACTIVEONES[onelem.name] = -2;
        onelem.style.background = "white";
    } else {
        console.log("mute node", onelem.name);
        ACTIVEONES[onelem.name] = -3;
        onelem.style.background = "gray";
    }
}

function settouchpos( event ){
    if( event.type === "touchmove" ) {
      touchx = event.touches[0].clientX;
      touchy = event.touches[0].clientY;
    } else {
      touchx = event.clientX;
      touchy = event.clientY;
    }
    console.log(touchx, touchy);
}

function screenpostopagepos(x,y) { // crossbrowser version
    let body = document.body;
    let docEl = document.documentElement;

    let scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    let scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    
    let clientTop = docEl.screenY || 0;
    let clientLeft = docEl.screenX || 0;

    console.log("y", y, scrollTop, clientTop);
    console.log("x", x, scrollLeft, clientLeft);
    var ny  = (y + scrollTop) - clientTop;
    var nx = (x + scrollLeft) - clientLeft;

    return [nx, ny];
}

function movearound( event, oldev ){
    let onelem = oldev.target || oldev.srcElement;
    //console.log( event.originalEvent.pageX );
    //onelem.style.position = "absolute";
    let xx = event.pageX;
    let yy = event.pageY;
    /*if( event.pageX !== undefined ){
       
            let xy = screenpostopagepos(event.screenX, event.screenY);
            xx = xy[0];
            yy = xy[1];
        
    } else {
        xx = touchx;
        yy = touchy;
    }
    console.log(xx,yy, event.pageX, event);
    */
    onelem.parentNode.style.left = xx.toString()+"px";
    onelem.parentNode.style.top = yy.toString()+"px";
    onelem.parentNode.style.background = "#"+  Math.random().toString(16).substring(2, 8);
    if( onelem.parentNode.name === "nono" ){
        DARWINGS[parseInt(onelem.name)].style.left = xx.toString()+"px";
        DARWINGS[parseInt(onelem.name)].style.top = (yy+15).toString()+"px";
    } else if( onelem.parentNode.name === "nononono" ){
        DARWINGS[parseInt(onelem.name)][2].style.left = xx.toString()+"px";
        DARWINGS[parseInt(onelem.name)][2].style.top = (yy+15).toString()+"px";
        DARWINGS[parseInt(onelem.name)][0] = xx;
        DARWINGS[parseInt(onelem.name)][1] = yy;
    } else {
        DARWINGS[parseInt(onelem.name)][0] = xx;
        DARWINGS[parseInt(onelem.name)][1] = yy;
    }
    drawallconn();
    
}

function setLwidth( ){
    let lw = prompt("Enter Line width (1-100):");
    if( lw && lw !== "" ){
        //console.log(lw);
        STROWIDTH = lw;     
    }
}

function insertpictocanvas( elem, index ){
    let url = window.URL.createObjectURL( elem.files[0] );
    let image = new Image( );
        image.onload = function( ) {
            
            let tempcanv = document.createElement( "canvas" );
            let thisctx = tempcanv.getContext("2d");
            let conth = image.height;
            tempcanv.height = conth;
            let contw = image.width;
            tempcanv.width = contw;
            thisctx.drawImage( image, 0, 0 );
            
            //get data of image
            let currw = DARWINGS[ index ].width;
            let currh = DARWINGS[ index ].height;
            console.log("currw", currw, "currh", currh );
            let D1D = thisctx.getImageData( 0,0, currw, currh );
            let thectx = DARWINGS[ index ].getContext("2d");
            let D2D = thectx.getImageData( 0,0, currw, currh );
            let ll = D1D.data.length;
            for( let x = 0; x < currw ; x+=1 ){
                for( let y = 0; y < currh ; y+=1 ){
	                let pos = (x+(y*currw))*4;
                    if( pos < ll && x < contw && y < conth ){
                        //if( D2D.data[ pos ] !== 254 && D2D.data[ pos+1 ] !== 254 && D2D.data[ pos+2 ] !== 254  ){
                        if( D2D.data[ pos+3 ] !== 0 ){
			                D2D.data[ pos ] =  Math.round(   ( D1D.data[ pos   ] + D2D.data[ pos   ] )/ 2 );
                            D2D.data[ pos+1 ] =  Math.round( ( D1D.data[ pos+1 ] + D2D.data[ pos+1 ] )/ 2 );
                            D2D.data[ pos+2 ] =  Math.round( ( D1D.data[ pos+2 ] + D2D.data[ pos+2 ] )/ 2 );
                            D2D.data[ pos+3 ] =  Math.round( ( D1D.data[ pos+3 ] + D2D.data[ pos+3 ] )/ 2 );
                        } else {
                            D2D.data[ pos ] = D1D.data[ pos   ];
                            D2D.data[ pos+1 ] =  D1D.data[ pos+1 ];
                            D2D.data[ pos+2 ] =  D1D.data[ pos+2 ];
                            D2D.data[ pos+3 ] =  D1D.data[ pos+3 ];
                        }
                    }
                    /*if( pos < ll ){
                        
                    }*/
				        
            
                }
            }
            thectx.putImageData( D2D, 0, 0 );
        }
        image.src = url;
}

function showpicker( x, y ){
    //gen color array
    let d = document.createElement( "div" );
        d.style.display = "block";
        d.style.position = "absolute";//**
        d.style.left = x;
        d.style.top = y;
        d.style.zIndex = 11;
    //onclick set STROKESTY and close the color window
    for( let r = 0; r < 100; r+=1 ){
        let c = "#"+  Math.random().toString(16).substring(2, 8);
        let m = document.createElement( "span" );
        m.className = "colorfield";
        m.innerHTML = "LLL";
        m.style.color = c;
        m.style.background = c;
        m.onclick = function(){STROKESTY = this.style.background; this.parentNode.parentNode.removeChild( this.parentNode )};
        d.appendChild( m );
    }
    document.body.appendChild( d );
}

function drawingmodmenu( x, y, nn ){
        //add a menu
        let d = document.createElement( "div" );
        d.style.display = "block";
        d.style.position = "absolute";//**
        d.style.left = x;
        d.style.top = y;
        d.style.zIndex = 10; //global for active drwing area
        d.id = "men" + nn.toString();
        //color
        let m1 = document.createElement( "div" );
        m1.className = "nodemenent";
        m1.innerHTML = "Color";
        m1.onclick = function(){ showpicker( x, y ); };
        d.appendChild( m1 );
        //width
        let m2 = document.createElement( "div" );
        m2.className = "nodemenent";
        m2.innerHTML = "Line Width";
        m2.onclick = function(){setLwidth();};
        d.appendChild( m2 );
        //open pic
        let m3 = document.createElement( "input" );
        m3.type = "file";
        m3.style.width = "100px";
        m3.className = "nodemenent";
        m3.onchange = function(){ insertpictocanvas( this, parseInt( nn ) ); }; //give this menu elemnt and the name - is the index of the element in ther drwings array
        d.appendChild( m3 );
        //options for
        //background deletion - on whole
        let m4 = document.createElement( "div" );
        m4.className = "nodemenent";
        m4.innerHTML = "BG removal";
        m4.onclick = function(){};
        d.appendChild( m4 );
        //kanten - "
        let m5 = document.createElement( "div" );
        m5.className = "nodemenent";
        m5.innerHTML = "Line extraction";
        m5.onclick = function(){};
        d.appendChild( m5 );
        //nachzeichnen - "
        let m6 = document.createElement( "div" );
        m6.className = "nodemenent";
        m6.innerHTML = "Redraw";
        m6.onclick = function(){};
        d.appendChild( m6 );
        //merge interpolation and so on?? oder sollte das immer so gemacht werden??
        document.body.appendChild( d );
}

function aktiAudio( e ){
    if( !audioctx ){
        audioctx = new AudioContext();
    }
    e.target.parentNode.removeChild( e.target  );
}

/*******************************************************************************

    insert nodes & main menu

*******************************************************************************/

function arithnode( x, y, typedenode ){
    
    let d = document.createElement( "div" );
    d.style.display = "block";
    d.style.position = "absolute";//**
    d.style.left = x.toString()+"px";
    d.style.top = y.toString()+"px";
    d.style.zIndex = 5;
    d.style.background = "#"+  Math.random().toString(16).substring(2, 8);
    if( maxnodemenwidth !== null ){
        d.style.width = maxnodemenwidth.toString() +"px";
    }
    d.className = "nodemen";
    d.name = typedenode;
    d.innerHTML = "Nr: "+ (DARWINGS.length).toString( );
    d.id = (DARWINGS.length).toString( );

    let m7 = document.createElement( "span" );
    m7.className = "nodemenent";
    m7.innerHTML = "🖐️";
    m7.name = DARWINGS.length-1;
    m7.draggable = true;
    //m7.ondragend = function(){ movearound( event ); };
    /*m7.onpointerdown = function(){ settouchpos( event ); };
    m7.onpointermove = function(){ settouchpos( event ); };
    m7.onpointerup = function(){ movearound( event ); };*/
    d.appendChild( m7 );

    let m1 = document.createElement( "span" );
    m1.className = "nodemenent";
    m1.name = DARWINGS.length-1;
    m1.innerHTML = "CO";
    //m1.onpointerdown = function(){  };
    //m1.onpointerup = function(){ endconn( event ); };
    d.appendChild( m1 );
    let m2 = document.createElement( "span" );
    m2.className = "nodemenent";
    m2.innerHTML = "XC";
    m2.title = "Clear all outgoing connections!";
    m2.name = ACTIVEONES.length-1;
    m2.onpointerup = function(){ xconn( event ); };
    d.appendChild( m2 );
    
    if( typedenode === "sum" ){
        
        let m11 = document.createElement( "span" );
        m11.className = "nodemenent";
        m11.innerHTML = "SC";
        m11.title = "Set count of activations .";
        m11.name = ACTIVEONES.length-1;
        m11.onclick = function(){ setCount( this ); };
        d.appendChild( m11 );
        let m9 = document.createElement( "span" );
        m9.innerHTML = " "+DARWINGS[DARWINGS.length-1][2];
        d.appendChild( m9 );
        
    } else if( typedenode === "split" ){
        let m8 = document.createElement( "span" );
        m8.className = "nodemenent";
        m8.innerHTML = "MU";
        m8.name = DARWINGS.length-1;
        m8.onclick = function(){ munode( event ); };
        d.appendChild( m8 );
        let m11 = document.createElement( "span" );
        m11.className = "nodemenent";
        m11.innerHTML = "DU";
        m11.title = "Set Duration of node in ms.";
        m11.name = ACTIVEONES.length-1;
        m11.onclick = function(){ setDur( this ); };
        d.appendChild( m11 );
    }

    let m10 = document.createElement( "span" );
    m10.innerHTML = "  "+typedenode;
    d.appendChild( m10 );
    document.body.appendChild( d );

    let m12 = document.createElement( "span" );
    if( typedenode === "split" ){
        m12.innerHTML = " "+DURATIONS[DURATIONS.length-1];
    }
    d.appendChild( m12 );    
    document.body.appendChild( d );
}

function insertSumNode( e ){
    console.log("sum node");
    CADDX = e.pageX;
    CADDY = e.pageY;
    TRAJ.push([]);
    DARWINGS.push( [CADDX, CADDY, 0] );
    ACTIVEONES.push( -2 );
    DURATIONS.push( 0 );
    MODUS.push("sum");
    
    arithnode(CADDX, CADDY, "sum");
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );    
}

function insertSplitNode(e ){
    console.log("split node");
    TRAJ.push([]);
    CADDX = e.pageX;
    CADDY = e.pageY;
    DARWINGS.push( [CADDX, CADDY] );
    ACTIVEONES.push( -2 );
    DURATIONS.push( 0 );
    MODUS.push("split");
    
    arithnode(CADDX, CADDY, "split"); 
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function insertSwitchNode( e ){
    console.log("switch node");
    TRAJ.push([]);
    CADDX = e.pageX;
    CADDY = e.pageY;
    DARWINGS.push( [CADDX, CADDY, 0] );
    ACTIVEONES.push( 0 );
    DURATIONS.push( 0 );
    MODUS.push("switch");
    
    arithnode(CADDX, CADDY, "switch"); 
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function insertStochNode( e ){
    console.log("stochastic node");
    TRAJ.push([]);
    CADDX = e.pageX;
    CADDY = e.pageY;
    DARWINGS.push( [CADDX, CADDY, 0, [], []] ); 
    ACTIVEONES.push( 0 );
    DURATIONS.push( 0 );
    MODUS.push("stocha");
    arithnode( CADDX, CADDY, "stocha" ); 
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function insertTHEnodeStuff( CADDX, CADDY, label ){
    let d = document.createElement( "div" );
    d.style.display = "block";
    d.style.position = "absolute";//**
    d.style.left = CADDX.toString()+"px";
    d.style.top = CADDY.toString()+"px";
    d.style.zIndex = 5;
    d.style.background = "#"+  Math.random().toString(16).substring(2, 8);
    if( maxnodemenwidth !== null ){
        d.style.width = maxnodemenwidth.toString() +"px";
    }
    d.className = "nodemen";
    d.name = "audiofilenode";
    d.innerHTML = "Nr: "+ (DARWINGS.length).toString( );
    d.id =(DARWINGS.length).toString( );


    let m7 = document.createElement( "span" );
    m7.className = "nodemenent";
    m7.innerHTML = "🖐️";
    m7.name = DARWINGS.length-1;
    m7.draggable = true;
    m7.ondragend = function(){ movearound( event ); };
    /*m7.ontouchstart = function(){ settouchpos( event ); };
    m7.ontouchmove = function(){ settouchpos( event ); };
    m7.ontouchend = function(){ movearound( event ); };*/
    d.appendChild( m7 );

    let m1 = document.createElement( "span" );
    m1.className = "nodemenent";
    m1.name = DARWINGS.length-1;
    m1.innerHTML = "CO";
    //m1.onpointerdown = function(){ startconn( event ); };
    //m1.onpointerup = function(){ endconn( event ); };
    d.appendChild( m1 );

    let m2 = document.createElement( "span" );
    m2.className = "nodemenent";
    m2.innerHTML = "XC";
    m2.title = "Clear all outgoing connections!";
    m2.name = ACTIVEONES.length-1;
    m2.onpointerup = function(){ xconn( event ); };
    d.appendChild( m2 );
    let m6 = document.createElement( "span" );
    m6.className = "nodemenent";
    m6.innerHTML = "☈";
    m6.title = "Activate node and emit action.";
    m6.name = ACTIVEONES.length-1;
    m6.onclick = function(){ emittAction( parseInt(this.name) ); };
    d.appendChild( m6 );

    let m8 = document.createElement( "span" );
    m8.className = "nodemenent";
    m8.innerHTML = "MU";
    m8.name = DARWINGS.length-1;
    m8.onclick = function(){ munode( event ); };
    d.appendChild( m8 );
    
    let m10 = document.createElement( "span" );
    m10.innerHTML = label;
    m10.name = DARWINGS.length-1;
    d.appendChild( m10 );
    document.body.appendChild( d );
}

function insertAudNode( e ){
    let inputis = document.createElement( "input" );
    inputis.type = "file";
    inputis.click();
    inputis.onchange = function( fileevent ){
        let fifisel = fileevent.target.files[0];
        //console.log(fileevent.target);
        if( fifisel.name.indexOf( ".wav" ) !== -1 ||
            fifisel.name.indexOf( ".mp3" ) !== -1 ){
            
            let reader = new FileReader();
            reader.readAsArrayBuffer( fifisel );
        
            reader.onload = function( ){
                    //AUDIOBUFFERFC.push( JSON.stringify( reader.result ) );
                    //console.log(AUDIOBUFFERFC);
                    AUDIOBUFFERFC.push( ab2str( reader.result ) );
                    audioctx.decodeAudioData( reader.result ).then( function( decodedData ) {
                        //data and audio api section
                        AUDIOBUFFER.push( decodedData );
                        let source = audioctx.createBufferSource( );
                        source.buffer = decodedData;
                        source.connect( audioctx.destination );
                        CADDX = e.pageX;
                        CADDY = e.pageY;
                        DARWINGS.push( [CADDX, CADDY, source, AUDIOBUFFER.length-1, fifisel.name + " ("+ Math.floor(source.buffer.duration*1000).toString() +")"] );
                        DURATIONS.push( source.buffer.duration*1000 ); //time of sound file
                        TRAJ.push([]);
                        ACTIVEONES.push( -2 );
                        MODUS.push("audiofile");
                        
                        //call html uilding                        
                        insertTHEnodeStuff(CADDX, CADDY, fifisel.name + " ("+ Math.floor(source.buffer.duration*1000).toString() +")");     
                });
            };
        }
    };
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function buildaudioelemfromYTvideoID( theurlis, videoID, x, y ){
    fetch( "cors.php?yuturl=https://www.youtube.com/get_video_info?video_id=" + videoID ).then( response => {
        if( response.ok ){
            response.text( ).then( theresp => {
            //parse response to find audio info
            let yd = parse_audiodesc( theresp );
            let plaplaresp = JSON.parse( yd.player_response );
            /*for( let a in plaplaresp){
                console.log( a, plaplaresp[a] );
            }*/
            
            let af = plaplaresp.streamingData.adaptiveFormats;
            let ainfo = af.findIndex(obj => obj.audioQuality);
            console.log(ainfo);
          
            // get the URL for the audio file
            let audioURL = af[ ainfo ].url;
            if( audioURL !== undefined ){
                console.log("Call audio stream:", audioURL);
                //set duration of node
                let audio = new Audio( audioURL );
                audio.addEventListener("canplaythrough", event => {
                    console.log("URL, can play now", videoID);
                });

                CADDX = x;
                CADDY = y;
                TRAJ.push( [] );
                MODUS.push("url");
                ACTIVEONES.push( -2 );
                DURATIONS.push( parseInt(af[ ainfo ].approxDurationMs) );

                DARWINGS.push( [CADDX, CADDY, audio, theurlis, videoID, parseInt(af[ ainfo ].approxDurationMs)] );
                let lab = videoID + " ("+ af[ ainfo ].approxDurationMs +")";
                insertTHEnodeStuff( CADDX, CADDY, lab);
                
            } else {
                //OH NO - NO URL OF STREAM DATA GIVEN, need to decrypt the signatureCypher
                //first get the google JS
                //parse the JS, Parser: https://github.com/mps-youtube/pafy/blob/develop/pafy/backend_shared.py
                //extract the decryption
                //do the audio elemnt
                alert("Audio URL encryption unkown!");
                return null;
            }
          
        });
      }
    });
}

function insertUrlNode( e ){
    let theurlis = prompt("Enter Youtube URL!");
    if( theurlis.indexOf("youtube") !== -1 ||
        theurlis.indexOf("youtu.be") !== -1 ){ 
        let videoID = null; // YouTube video ID
        if( theurlis.indexOf("?v=") !== -1 ){
            let tempsplit = theurlis.split( "?v=" );
            videoID = tempsplit[tempsplit.length-1];
        } else {
            let tempsplit = theurlis.split( "/" );
            videoID = tempsplit[tempsplit.length-1];
        }
        
        //https://www.youtube.com/watch?v=Mtqbwy-fgFc - not working
        //https://youtu.be/hK2898UEyRE - working
        //https://youtu.be/tX54jiLjZno
        //https://youtu.be/IX7moF_pD5M
        //https://youtu.be/ODkERmUh0hQ

        console.log("Got videoID: ", videoID );
        // Fetch video info (using a proxy to avoid CORS errors) 
        buildaudioelemfromYTvideoID( theurlis, videoID, e.pageX, e.pageY );
        
    } else {
        alert("Just Youtube supported at the moment.")
    }
    //close menu
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function insertAudRecNode( e ){
    CADDX = e.pageX;
    CADDY = e.pageY;
    if( navigator.getUserMedia ){
        navigator.getUserMedia( {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, streamtobuffer, function(ev) {
            alert('Error getting audio input!');
            console.warn( ev );
        });
    } else {
        alert('No getUserMeida in this Browser! - No fun!');
    }

    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function buildmidiMen(){
    //prepare the shit
    let d = document.createElement( "div" );
    d.style.display = "block";
    d.style.position = "absolute";//**
    d.style.left = CADDX.toString()+"px";
    d.style.top = CADDY.toString()+"px";
    d.style.zIndex = 5;
    d.style.background = "#"+  Math.random().toString(16).substring(2, 8);
    if( maxnodemenwidth !== null ){
        d.style.width = maxnodemenwidth.toString() +"px";
    }
    d.className = "nodemen";
    d.name = "nononono";
    d.innerHTML = "Nr: "+ (DARWINGS.length).toString( );
    d.id = (DARWINGS.length).toString( );

    let m7 = document.createElement( "span" );
    m7.className = "nodemenent";
    m7.innerHTML = "🖐️ ";
    m7.name = ACTIVEONES.length-1;
    m7.draggable = true;
    m7.ondragend = function(){ movearound( event ); };
    /*m7.ontouchstart = function(){ settouchpos( event ); };
    m7.ontouchmove = function(){ settouchpos( event ); };
    m7.ontouchend = function(){ movearound( event ); };*/
    d.appendChild( m7 );

    let m1 = document.createElement( "span" );
    m1.className = "nodemenent";
    m1.name = ACTIVEONES.length-1;
    m1.innerHTML = "CO";
    m1.title = "Connections!";
    //m1.onpointerdown = function(){ startconn( event ); };
    //m1.onpointerup = function(){ endconn( event ); };
    d.appendChild( m1 );

    let m2 = document.createElement( "span" );
    m2.className = "nodemenent";
    m2.innerHTML = "XC";
    m2.title = "Clear all outgoing connections!";
    m2.name = ACTIVEONES.length-1;
    m2.onpointerup = function(){ xconn( event ); };
    d.appendChild( m2 );
    let m5 = document.createElement( "span" );
    m5.className = "nodemenent";
    m5.innerHTML = "DU";
    m5.title = "Set Duration of node in ms.";
    m5.name = ACTIVEONES.length-1;
    m5.onclick = function(){ setDur( this ); };
    d.appendChild( m5 );
    let m6 = document.createElement( "span" );
    m6.className = "nodemenent";
    m6.innerHTML = "☈";
    m6.title = "Activate node and emit action.";
    m6.name = ACTIVEONES.length-1;
    m6.onclick = function(){ emittAction( parseInt(this.name) ); };
    d.appendChild( m6 );
    let m8 = document.createElement( "span" );
    m8.className = "nodemenent";
    m8.innerHTML = "MU";
    m8.title = "Mute node and stop emitting of action.";
    m8.name = ACTIVEONES.length-1;
    m8.onclick = function(){ munode( event ); };
    d.appendChild( m8 );
    let m10 = document.createElement( "span" );
    m10.innerHTML = "midi ";
    d.appendChild( m10 );
    document.body.appendChild( d );
    let m9 = document.createElement( "span" );
    m9.innerHTML = DURATIONS[DURATIONS.length-1];
    d.appendChild( m9 );
    document.body.appendChild( d );

    //midimassage-> m=on/off, mode=note/adtert/pibend, chanoff=1-6, ch=0-2, n=0-128, vel=0-128
    let midimen = document.createElement( "div" );
    midimen.className = "midinode";
    midimen.type = "#"+  Math.random().toString(16).substring(2, 8);
    midimen.name = ACTIVEONES.length-1;
    midimen.style.left = CADDX.toString()+"px";
    midimen.style.top = (CADDY+15).toString()+"px";
    if( maxnodemenwidth !== null ){
        midimen.style.width = maxnodemenwidth.toString() +"px";
    }
    DARWINGS[ACTIVEONES.length-1][2] = midimen;
    document.body.appendChild( midimen );

    //mode
    let p1 = document.createElement("select");
    p1.name = ACTIVEONES.length-1;
    p1.onchange = function( evvv ){ DARWINGS[evvv.target.name][3] = evvv.target.value; };
    //console.log(DARWINGS, ACTIVEONES.length-1);
    if( DARWINGS[ACTIVEONES.length-1][3] === undefined ){
        DARWINGS[ACTIVEONES.length-1].push("note");
    }
    p1.title = "Note, Aftertouch, Pitchbend";
    let opts = ["note","adtert","pibend"];
    for( let t in opts ){
        let o =   document.createElement( "option" ); 
        o.value = opts[t];
        if( o.value === DARWINGS[ACTIVEONES.length-1][3] ){
            o.selected = true;
        }
        o.innerHTML = opts[t];
        p1.appendChild( o );
    }
    midimen.appendChild( p1 );
    //offset -- turned into a 
    let p2 = document.createElement("select");
    p2.name = ACTIVEONES.length-1;
    //p2.title = "Channeloffset 1-6";
    p2.title = "Channel 1-16";
    p2.onchange = function( evvv ){ 
        if( evvv.target.value === 1 ){ //channel 1 selected
            DARWINGS[evvv.target.name][4] = 1; //offset
            DARWINGS[evvv.target.name][5] = 0; //chan ondex peroffset
        } else if( evvv.target.value === 2 ){ //channel 2 selected
            DARWINGS[evvv.target.name][4] = 1; //offset
            DARWINGS[evvv.target.name][5] = 1; //chan ondex peroffset
        } else if( evvv.target.value === 3 ){
            DARWINGS[evvv.target.name][4] = 1; //offset
            DARWINGS[evvv.target.name][5] = 2; //chan ondex peroffset
        } else if( evvv.target.value === 4 ){
            DARWINGS[evvv.target.name][4] = 2; //offset
            DARWINGS[evvv.target.name][5] = 0; //chan ondex peroffset
        } else if( evvv.target.value === 5 ){
            DARWINGS[evvv.target.name][4] = 2; //offset
            DARWINGS[evvv.target.name][5] = 1; //chan ondex peroffset
        } else if( evvv.target.value === 6 ){
            DARWINGS[evvv.target.name][4] = 2; //offset
            DARWINGS[evvv.target.name][5] = 2; //chan ondex peroffset
        } else if( evvv.target.value === 7 ){
            DARWINGS[evvv.target.name][4] = 3; //offset
            DARWINGS[evvv.target.name][5] = 0; //chan ondex peroffset
        } else if( evvv.target.value === 8 ){
            DARWINGS[evvv.target.name][4] = 3; //offset
            DARWINGS[evvv.target.name][5] = 1; //chan ondex peroffset
        } else if( evvv.target.value === 9 ){
            DARWINGS[evvv.target.name][4] = 3; //offset
            DARWINGS[evvv.target.name][5] = 2; //chan ondex peroffset
        } else if( evvv.target.value === 10 ){
            DARWINGS[evvv.target.name][4] = 4; //offset
            DARWINGS[evvv.target.name][5] = 0; //chan ondex peroffset
        } else if( evvv.target.value === 11 ){
            DARWINGS[evvv.target.name][4] = 4; //offset
            DARWINGS[evvv.target.name][5] = 1; //chan ondex peroffset
        } else if( evvv.target.value === 12 ){
            DARWINGS[evvv.target.name][4] = 4; //offset
            DARWINGS[evvv.target.name][5] = 2; //chan ondex peroffset
        } else if( evvv.target.value === 13 ){
            DARWINGS[evvv.target.name][4] = 5; //offset
            DARWINGS[evvv.target.name][5] = 0; //chan ondex peroffset
        } else if( evvv.target.value === 14 ){
            DARWINGS[evvv.target.name][4] = 5; //offset
            DARWINGS[evvv.target.name][5] = 1; //chan ondex peroffset
        } else if( evvv.target.value === 15 ){
            DARWINGS[evvv.target.name][4] = 5; //offset
            DARWINGS[evvv.target.name][5] = 2; //chan ondex peroffset
        } else if( evvv.target.value === 16 ){
            DARWINGS[evvv.target.name][4] = 6; //offset
            DARWINGS[evvv.target.name][5] = 0; //chan ondex peroffset
        } 
    };
    if( DARWINGS[ACTIVEONES.length-1][4] === undefined ){
        DARWINGS[ACTIVEONES.length-1].push(1);
    }
    for( let t = 1; t < 17; t+=1 ){
        let o =   document.createElement( "option" ); 
        o.value = t;
        if( o.value === DARWINGS[ACTIVEONES.length-1][4] ){
            o.selected = true;
        }
        o.innerHTML = t;
        p2.appendChild( o );
    }
    midimen.appendChild( p2 );
    //ch --- channel index per offset, but not used
    let p3 = document.createElement("select");
    p3.name = ACTIVEONES.length-1;
    p3.title = "Channelindex in Offset 0-2";
    p3.onchange = function( evvv ){ DARWINGS[evvv.target.name][5] = evvv.target.value; };
    if( DARWINGS[ACTIVEONES.length-1][5] === undefined ){
        DARWINGS[ACTIVEONES.length-1].push(0);
    }
    for( let t = 0; t < 3; t+=1 ){
        let o =   document.createElement( "option" ); 
        o.value = t;
        if( o.value === DARWINGS[ACTIVEONES.length-1][5] ){
            o.selected = true;
        }
        o.innerHTML = t;
        p3.appendChild( o );
    }
    //midimen.appendChild( p3 );
    //n 
    
    let p4 = document.createElement("select");
    p4.name = ACTIVEONES.length-1;
    p4.title = "Midi Notes";
    p4.onchange = function( evvv ){ DARWINGS[evvv.target.name][6] = evvv.target.value; };
    if( DARWINGS[ACTIVEONES.length-1][6] === undefined ){
        DARWINGS[ACTIVEONES.length-1].push(127);
    }
    for( let t in midiNotes ){
        let o =   document.createElement( "option" ); 
        o.value = midiNotes[t];
        if( o.value === DARWINGS[ACTIVEONES.length-1][6] ){
            o.selected = true;
        }
        o.innerHTML = t;
        p4.appendChild( o );
    }
    midimen.appendChild( p4 );
    //vel
    let p5 = document.createElement("select");
    p5.name = ACTIVEONES.length-1;
    p5.title = "Velocity";
    
    p5.onchange = function( evvv ){ DARWINGS[evvv.target.name][7] = evvv.target.value; };
    if( DARWINGS[ACTIVEONES.length-1][7] === undefined ){
        DARWINGS[ACTIVEONES.length-1].push(127);
    }
    for( let t = 127; t > -1; t-=1 ){
        let o =   document.createElement( "option" ); 
        o.value = t;
        if( o.value === DARWINGS[ACTIVEONES.length-1][7] ){
            o.selected = true;
        }
        o.innerHTML = t;
        p5.appendChild( o );
    }
    midimen.appendChild( p5 );
}

function insertMidiNode( e ){
    //show menu to configure the midi note or insert it to a popup - jes of cause
    CADDX = e.pageX;
    CADDY = e.pageY;

    TRAJ.push( [] );
    MODUS.push("midimag");
    ACTIVEONES.push( -2 );
    DURATIONS.push( 1000 );
    DARWINGS.push( [CADDX, CADDY, null] ); //x y elemthat has midi menu and is treted like cavas, midi data

    buildmidiMen();
    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function insertAnodedraw( args ){  
    lock = true;
    let drawarea = document.createElement( "canvas" );
    drawarea.className = "drwnode";
    //drawarea.addEventListener('pointerup',   function( e ){   onpointerupEventFkt(e);    }, false);
    //drawarea.addEventListener('pointermove', function( e ){   pointermoveEvfkt(e);     }, false);
    //drawarea.addEventListener('pointerdown', function( e ){   onpointerdownEventFkt(e);  }, false);
    drawarea.type = "#"+  Math.random().toString(16).substring(2, 8);
    
    
    if( args === undefined ){
        drawarea.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        drawarea.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        //noelem.appendChild(drawarea);
        TRAJ.push([]);
        MODUS.push(0);
        ACTIVEONES.push( -2 );
        DURATIONS.push( 1000 );
        DARWINGS.push( drawarea );
        drawarea.name = ACTIVEONES.length-1;
    } else {
        //[dw dh], [px py],  TRAJ, MODUS, DURATIONS, INOUT, PIC
        //console.log(args);
         //timing problem when pushing to the stack 
        drawarea.width = args[0][0];
        drawarea.height = args[0][1];
        let ctx = drawarea.getContext( '2d' );
        let image = new Image( );
        image.onload = function( ) {
            ctx.clearRect(0, 0, drawarea.width, drawarea.height);
            ctx.drawImage(image, 0, 0);
            DARWINGS.push( drawarea );
            lock = false;
        }
        image.src = args[6]; 
        CADDX = args[1][0];
        CADDY = args[1][1];
        
        
        
        TRAJ.push(args[2]);
        MODUS.push(args[3]);
        ACTIVEONES.push( -2 );
        DURATIONS.push( args[4] );
        drawarea.name = ACTIVEONES.length-1;
        for( let i in args[5]){
            console.log("conn", drawarea.name, args[5][i]);
            INOUT[parseInt(drawarea.name)].push( args[5][i] );
            
        }
        //console.log(INOUT);
        
    }
    drawarea.style.left = CADDX.toString()+"px";
    drawarea.style.top = (CADDY+15).toString()+"px";
    document.body.appendChild(drawarea);
   
}


function insertAnodemenu( ){
    console.log("m node");
    let d = document.createElement( "div" );
    d.style.display = "block";
    d.style.position = "absolute";//**
    d.style.left = CADDX.toString()+"px";
    d.style.top = CADDY.toString()+"px";
    d.style.zIndex = 5;
    d.style.background = "#"+  Math.random().toString(16).substring(2, 8);
    if( maxnodemenwidth !== null ){
        d.style.width = maxnodemenwidth.toString() +"px";
    }
    d.className = "nodemen";
    d.name = "nono";
    d.innerHTML = "Nr: "+ (ACTIVEONES.length).toString( );
    d.id = (ACTIVEONES.length).toString( );

    let m7 = document.createElement( "span" );
    m7.className = "nodemenent";
    m7.innerHTML = "🖐️ ";
    m7.name = ACTIVEONES.length-1;
    m7.draggable = true;
    m7.ondragend = function(){ movearound( event ); };
    /*m7.onpointerdown = function(){ settouchpos( event ); };
    m7.onpointermove = function(){ settouchpos( event ); };
    m7.onpointerup = function(){ movearound( event ); };*/
    d.appendChild( m7 );

    let m1 = document.createElement( "span" );
    m1.className = "nodemenent";
    m1.name = ACTIVEONES.length-1;
    m1.innerHTML = "CO";
    m1.title = "Connections!";
    //m1.onpointerdown = function(){ startconn( event ); };
    //m1.onpointerup = function(){ endconn( event ); };
    d.appendChild( m1 );
    let m2 = document.createElement( "span" );
    m2.className = "nodemenent";
    m2.innerHTML = "XC";
    m2.title = "Clear all outgoing connections!";
    m2.name = ACTIVEONES.length-1;
    m2.onpointerup = function(){ xconn( event ); };
    d.appendChild( m2 );
    let m3 = document.createElement( "span" );
    m3.className = "nodemenent";
    m3.innerHTML = "ED";
    m3.title = "Edit picture aka draw.";
    m3.name = ACTIVEONES.length-1;
    m3.onclick = function(){ setTOEdit( event, parseInt(this.name) ); };
    d.appendChild( m3 );
    let m4 = document.createElement( "span" );
    m4.className = "nodemenent";
    m4.innerHTML = "MO";
    m4.name = ACTIVEONES.length-1;
    m4.onclick = function(){ setMO( parseInt(this.name) ); };
    m4.title = "Select modus of node.";
    d.appendChild( m4 );
    let m5 = document.createElement( "span" );
    m5.className = "nodemenent";
    m5.innerHTML = "DU";
    m5.title = "Set Duration of node in ms.";
    m5.name = ACTIVEONES.length-1;
    m5.onclick = function(){ setDur( this ); };
    d.appendChild( m5 );
    let m6 = document.createElement( "span" );
    m6.className = "nodemenent";
    m6.innerHTML = "☈";
    m6.title = "Activate node and emit action.";
    m6.name = ACTIVEONES.length-1;
    m6.onclick = function(){ emittAction( parseInt(this.name) ); };
    d.appendChild( m6 );
    let m8 = document.createElement( "span" );
    m8.className = "nodemenent";
    m8.innerHTML = "MU";
    m8.title = "Mute node and stop emitting of action.";
    m8.name = ACTIVEONES.length-1;
    m8.onclick = function(){ munode( event ); };
    d.appendChild( m8 );
    let m9 = document.createElement( "span" );
    
    m9.innerHTML = DURATIONS[DURATIONS.length-1];
    d.appendChild( m9 );
    //inelem.appendChild( d );
    document.body.appendChild( d );
}

function drawNode( e ){
    CADDX = e.pageX;
    CADDY = e.pageY;
    //zuerst muss gezeichnet werden
    //bild eingezeichnet werden
    insertAnodedraw();
    //oder zuerst muss menu
    insertAnodemenu();

    e.target.parentNode.parentNode.removeChild( e.target.parentNode  );
}

function showmainmenu( e ){
    let ih = (window.innerHeight || document.documentElement.clientHeight);
    let iw = (window.innerWidth || document.documentElement.clientWidth);
    let oh = (window.pageYOffset || document.documentElement.pageYOffset || 0);
    let ow = (window.pageXOffset || document.documentElement.pageXOffset || 0);
    
    CADDX = e.pageX;
    CADDY = e.pageY;

    let ohih = oh+ih;
    //console.log(CADDY + mainmenlength, ohih, oh, ih)
    if( CADDY + mainmenlength > ohih ){
        let untersch = CADDY + mainmenlength - ohih;
        CADDY = CADDY - (untersch-1);
    }

    let d = document.createElement( "div" );
    d.className = "mainmen";
    d.id = "themainmen";
    
    d.style.left = CADDX.toString()+"px";
    d.style.top = CADDY.toString()+"px";
    d.style.background = "#"+  Math.random().toString(16).substring(2, 8);
    if( mainmenwidth !== null ){
        d.style.height = mainmenlength.toString()+"px";
        d.style.width = mainmenwidth.toString()+"px";
    }    

    let m9 = document.createElement( "div" );
    m9.innerHTML = "None";
    m9.className = "mainmenent";
    m9.onclick = function(){ nonedone( event ); };
    d.appendChild( m9 );
 
    let m2 = document.createElement( "div" );
    m2.title = "Splits a input to some outputs and can add a delay time.";
    m2.innerHTML = "Add SplitNode";
    m2.className = "mainmenent";
    m2.onclick = function(){ insertSplitNode( event ); };
    d.appendChild( m2 );

    let m18 = document.createElement( "div" );
    m18.title = "Activity is switched across the outputs.";
    m18.innerHTML = "Add SwitchNode";
    m18.className = "mainmenent";
    m18.onclick = function(){ insertSwitchNode( event ); };
    d.appendChild( m18 );
    
    let m3 = document.createElement( "div" );
    m3.title = "Sum Node counts input and after the amount of activations reached in it fires.";
    m3.innerHTML = "Add SumNode";
    m3.className = "mainmenent";
    m3.onclick = function(){ insertSumNode( event ); };
    d.appendChild( m3 );

    let m21 = document.createElement( "div" );
    m21.title = "Stochastic Node fires on one of the outputs related to its weight.";
    m21.innerHTML = "Add StochNode";
    m21.className = "mainmenent";
    m21.onclick = function(){ insertStochNode( event ); };
    d.appendChild( m21 );

    let m20 = document.createElement( "br" );
    d.appendChild( m20 );

    let m1 = document.createElement( "div" );
    m1.innerHTML = "Add NotationNode";
    m1.title = "A node to turn a graphical notation into mide and OSC messages.";
    m1.className = "mainmenent";
    m1.onclick = function(){ drawNode( event ); };
    d.appendChild( m1 );

    let m12 = document.createElement( "div" );
    m12.title = "Add a node to play a sound file.";
    m12.innerHTML = "Add AudioFileNode";
    m12.className = "mainmenent";
    m12.onclick = function(){ insertAudNode( event ); };
    d.appendChild( m12 );

    let m14 = document.createElement( "div" );
    m14.title = "Add a node to record and play a sound.";
    m14.innerHTML = "Add AudioRecNode";
    m14.className = "mainmenent";
    m14.onclick = function(){ insertAudRecNode( event ); };
    d.appendChild( m14 );

    if( Midioutputs !== null || mainmenwidth == null ){
        let m15 = document.createElement( "div" );
        m15.title = "Add a node to create midi messages.";
        m15.innerHTML = "Add MidiNode";
        m15.className = "mainmenent";
        m15.onclick = function(){ insertMidiNode( event ); };
        d.appendChild( m15 );
    }

    let m19 = document.createElement( "div" );
    m19.title = "Add a node to play back sound from URL.";
    m19.innerHTML = "Add UrlNode";
    m19.className = "mainmenent";
    m19.onclick = function(){ insertUrlNode( event ); };
    d.appendChild( m19 );
    
    let m16 = document.createElement( "br" );
    d.appendChild( m16 );

    let m22 = document.createElement( "div" );
    m22.innerHTML = "Connections";
    m22.className = "mainmenent";
    m22.title = "Connect two nodes.";
    m22.onclick = function(){ kreuzschiene( event ); };
    d.appendChild( m22 );
    /*let m22 = document.createElement( "div" );
    m22.innerHTML = "Connect";
    m22.className = "mainmenent";
    m22.title = "Connect two nodes.";
    m22.onclick = function(){ conntwonodes( event ); };
    d.appendChild( m22 );
    
    let m23 = document.createElement( "div" );
    m23.innerHTML = "Del edges";
    m23.className = "mainmenent";
    m23.title = "Delete edges between two nodes.";
    m23.onclick = function(){ deledge( event ); };
    d.appendChild( m23 );

    let m26 = document.createElement( "div" );
    m26.innerHTML = "Del one edge";
    m26.className = "mainmenent";
    m26.title = "Delete one edge between two nodes.";
    m26.onclick = function(){ deledgeone( event ); };
    d.appendChild( m26 );*/

    let m25 = document.createElement( "div" );
    m25.innerHTML = "Del node";
    m25.className = "mainmenent";
    m25.title = "Delete a node.";
    m25.onclick = function(){ delnode( e, undefined ); };
    d.appendChild( m25 );

    let m24 = document.createElement( "div" );
    m24.innerHTML = "Mv node here";
    m24.className = "mainmenent";
    m24.title = "Define the new position of a nodes.";
    m24.onclick = function(){ posnode( event, e.pageX, e.pageY ); };
    d.appendChild( m24 );

    let m4 = document.createElement( "div" );
    m4.innerHTML = "Toggel STOP/DO";
    m4.className = "mainmenent";
    m4.title = "Stop all action in the sequencing network.";
    m4.onclick = function(){ toggelseqJESNO( event ); };
    d.appendChild( m4 );

    let m7 = document.createElement( "br" );
    d.appendChild( m7 );

    let m10 = document.createElement( "div" );
    m10.innerHTML = "Save";
    m10.title = "Save to local storage of browser.";
    m10.className = "mainmenent";
    m10.onclick = function(){ savetolocal( event ); };
    d.appendChild( m10 );

    let m11 = document.createElement( "div" );
    m11.innerHTML = "Open";
    m11.title = "Open from local storage of browser.";
    m11.className = "mainmenent";
    m11.onclick = function(){ openfromlocal( event ); }; 
    d.appendChild( m11 );

    let m8 = document.createElement( "br" );
    d.appendChild( m8 );
    
    let m5 = document.createElement( "div" );
    m5.innerHTML = "Down";
    m5.title = "Download the network and the drawings for later usage.";
    m5.className = "mainmenent";
    m5.onclick = function(){ downas( event ); };
    d.appendChild( m5 );

    let m6 = document.createElement( "input" );
    m6.title = "Upload a former network with drawings.";
    m6.type = "file";
    if( mainmenwidth !== null ){
        m6.style.width = (mainmenwidth-10).toString()+"px";
    } else {
        m6.style.width = "105px";
    }
    m6.style.fontSize = "80%";
    m6.className = "mainmenent";
    m6.onchange = function(){ uploadas( this ); };
    d.appendChild( m6 );
    
    //configure midi - button
    //configure audio input button

    let m17 = document.createElement( "div" );
    m17.innerHTML = "Reload &#8635;";
    m17.title = "Reload page.";
    m17.className = "mainmenent";
    m17.onclick = function(){ location.reload( ); };
    d.appendChild( m17 );
    
    document.body.appendChild( d );
    
    document.getElementById("nodesdrawbackground").style.background = "#"+  Math.random().toString(16).substring(2, 8);
}

/*******************************************************************************

    init

*******************************************************************************/

function permaineleminint( elem, index ){
    elem.width = WIDTH;
    elem.height = HEIGHT;
    elem.style.width = WIDTH.toString()+"px";
    elem.style.height = HEIGHT.toString()+"px";
    elem.style.display = "block";
    elem.style.position = "absolute";//**
    elem.style.left = 0;
    elem.style.top = 0;
    elem.style.zIndex = index;
}

function inint_workbench( ){
    console.log("Workbench size: ", WIDTH, HEIGHT);
    if( touchready( ) ){
        document.body.style.position = "fixed"; 
        document.body.style.overflow = "hidden";
        document.body.width = "100%";
        document.body.height = "100%";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
    } else {
        document.body.width = WIDTH;
        document.body.height = HEIGHT;
        document.body.style.width = WIDTH.toString()+"px";
        document.body.style.height = HEIGHT.toString()+"px";
    }

    document.body.addEventListener('pointerup', function( e ){ onpointerupEventFkt(e); }, false);
    document.body.addEventListener('pointermove', function( e ){ pointermoveEvfkt(e); }, false);
    document.body.addEventListener('pointerdown', function( e ){ onpointerdownEventFkt(e); }, false);

    let m13 = document.createElement( "input" );
    m13.style.fontSize = "400%";
    m13.style.position = "absolute";
    m13.style.left = "10px";//((WIDTH/2)-100).toString()+"px";
    m13.style.top = "10px";//((HEIGHT/2)-30).toString()+"px";
    m13.style.zIndex = "100";
    m13.value = "Audio ON!";
    m13.type = "Button";
    m13.className = "mainmenent";
    m13.onclick = function(){ aktiAudio( event ); };
    document.body.appendChild( m13 );

    createDB( dbname );
    midiInit( );

    let edelem = document.getElementById("edges");
    permaineleminint( edelem, 2 );
    connX = edelem.getContext("2d");
    let noelem = document.getElementById("nodesdrawbackground");
    permaineleminint( noelem, 1 );
    let inelem = document.getElementById("nodesinteract");
    permaineleminint( inelem, 3 );
    inelem.onclick = function(){ showmainmenu( event ); };

    //connection
    for( let i = 0; i < connlength; i+= 1){
        INOUT.push([]); //init connections as emptry
    }
    outoffset = Math.round(WIDTH/50);
    inoffset = Math.round(WIDTH/20);
    
    //do click on the audio button
    let clicki = document.createEvent('Event');
    clicki.initEvent('click', true, true); 
    clicki.pageX = 10;
    clicki.pageY = 10;
    m13.dispatchEvent( clicki );

    //get size of menu representations
    let clickii = document.createEvent('Event');
    clickii.initEvent('click', true, true); 
    clickii.pageX = 10;
    clickii.pageY = 10;
    inelem.dispatchEvent( clickii );
    let themenelm = document.getElementById( "themainmen" );
    mainmenwidth = themenelm.offsetWidth;
    mainmenlength = themenelm.offsetHeight;
    themenelm.parentNode.removeChild( themenelm  );
    
    //insert the maximum length menu node and messure
    CADDX = 10;
    CADDY = 10;    
    insertAnodedraw( );
    insertAnodemenu( );
    let nodemenelem = document.getElementById( "1" );
    maxnodemenwidth = nodemenelem.offsetWidth+10;
    maxnodemenlength = nodemenelem.offsetHeight;
    delnode( undefined, 1 );
}

function nande_ask_size( ){
    if( !touchready( ) ){
        let temw = prompt("Workbench width (no value given - screensize):");
        if( temw && temw !== "" ){
           WIDTH = parseInt( temw ); 
        } else {
            WIDTH = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        }
        let temh = prompt("Workbench height (no value given - screensize):");
        if( temh && temh !== "" ){
           HEIGHT = parseInt( temh ); 
        } else {
            HEIGHT = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        }
    } else {
        WIDTH = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        HEIGHT = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    }
}

//*e o f*//
