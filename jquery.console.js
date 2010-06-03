// JQuery Console 1.0
// Sun Feb 21 20:28:47 GMT 2010
//
// Copyright 2010 Chris Done. All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//
//    1. Redistributions of source code must retain the above
//       copyright notice, this list of conditions and the following
//       disclaimer.

//    2. Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials
//       provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY CHRIS DONE ``AS IS'' AND ANY EXPRESS
// OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL CHRIS DONE OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
// OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
// BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
// LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
// USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
// DAMAGE.

// The views and conclusions contained in the software and
// documentation are those of the authors and should not be
// interpreted as representing official policies, either expressed or
// implied, of Chris Done.
//
// TESTED ON
//   Internet Explorer 6
//   Opera 10.01
//   Chromium 4.0.237.0 (Ubuntu build 31094)
//   Firefox 3.5.8

(function($){
    $.fn.console = function(config){
        ////////////////////////////////////////////////////////////////////////
        // Constants
        // Some are enums, data types, others just for optimisation
        var keyCodes = { left:37,right:39,up:38,down:40,back:8,del:46,
                         end:35,start:36,ret:13,tab:18};
        var cursor = '<span class="jquery-console-cursor">&nbsp;</span>';
        // Opera only works with this character, not <wbr> or &shy;,
        // but IE6 displays this character, which is bad, so just use
        // it on Opera.
        var wbr = $.browser.opera? '&#8203;' : '';

        ////////////////////////////////////////////////////////////////////////
        // Globals
        var container = $(this);
        var inner = $('<div class="jquery-console-inner"></div>');
        var typer = $('<input class="jquery-console-typer" type="text">');
        // Prompt
        var promptBox;
        var prompt;
        var promptLabel = config && config.promptLabel? config.promptLabel : "> ";
        var column = 0;
        var promptText = '';
        var restoreText = '';
        // Prompt history stack
        var history = [];
        var ringn = 0;
        // For reasons unknown to The Sword of Michael himself, Opera
        // triggers and sends a key character when you hit various
        // keys like PgUp, End, etc. So there is no way of knowing
        // when a user has typed '#' or End. My solution is in the
        // typer.keydown and typer.keypress functions; I use the
        // variable below to ignore the keypress event if the keydown
        // event succeeds.
        var cancelKeyPress = 0;
	// When this value is false, the prompt will not respond to input
	var acceptInput = true;

        // External exports object
        var extern = {};

        ////////////////////////////////////////////////////////////////////////
        // Main entry point
        (function(){
            container.append(inner);
            inner.append(typer);
            typer.css({position:'absolute',top:0,left:'-9999px'});
            if (config.welcomeMessage)
                message(config.welcomeMessage,'jquery-console-welcome');
            newPromptBox();
            if (config.autofocus) {
                inner.addClass('jquery-console-focus');
                typer.focus();
                setTimeout(function(){
                    inner.addClass('jquery-console-focus');
                    typer.focus();
                },100);
            }
            extern.inner = inner;
            extern.typer = typer;
            extern.scrollToBottom = scrollToBottom;
        })();

        ////////////////////////////////////////////////////////////////////////
        // Reset terminal
        extern.reset = function(){
            var welcome = true;
            inner.parent().fadeOut(function(){
                inner.find('div').each(function(){
                    if (!welcome) 
                        $(this).remove();
                    welcome = false;
                });
                newPromptBox();
                inner.parent().fadeIn(function(){
                    inner.addClass('jquery-console-focus');
                    typer.focus();
                });
            });
        };

        ////////////////////////////////////////////////////////////////////////
        // Reset terminal
        extern.notice = function(msg,style){
            var n = $('<div class="notice"></div>').append($('<div></div>').text(msg))
                .css({visibility:'hidden'});
            container.append(n);
            var focused = true;
            if (style=='fadeout')
                setTimeout(function(){
                    n.fadeOut(function(){
                        n.remove();
                    });
                },4000);
            else if (style=='prompt') { 
                var a = $('<br/><div class="action"><a href="javascript:">OK</a><div class="clear"></div></div>');
                n.append(a);
                focused = false;
                a.click(function(){ n.fadeOut(function(){ n.remove();inner.css({opacity:1}) }); });
            }
            var h = n.height();
            n.css({height:'0px',visibility:'visible'})
                .animate({height:h+'px'},function(){
                    if (!focused) inner.css({opacity:0.5});
                });
            n.css('cursor','default');
            return n;
        };

        ////////////////////////////////////////////////////////////////////////
        // Make a new prompt box
        function newPromptBox() {
            column = 0;
            promptText = '';
	    ringn = 0; // Reset the position of the history ring
	    enableInput();
            promptBox = $('<div class="jquery-console-prompt-box"></div>');
            var label = $('<span class="jquery-console-prompt-label"></span>');
            promptBox.append(label.text(promptLabel).show());
            prompt = $('<span class="jquery-console-prompt"></span>');
            promptBox.append(prompt);
            inner.append(promptBox);
            updatePromptDisplay();
        };

        ////////////////////////////////////////////////////////////////////////
        // Handle setting focus
        container.click(function(){
            inner.addClass('jquery-console-focus');
            inner.removeClass('jquery-console-nofocus');
            typer.focus();
            scrollToBottom();
            return false;
        });

        ////////////////////////////////////////////////////////////////////////
        // Handle losing focus
        typer.blur(function(){
            inner.removeClass('jquery-console-focus');
            inner.addClass('jquery-console-nofocus');
        });

        ////////////////////////////////////////////////////////////////////////
        // Handle key hit before translation
        // For picking up control characters like up/left/down/right

        typer.keydown(function(e){
            cancelKeyPress = 0;
            var keyCode = e.keyCode;
            if (acceptInput && isControlCharacter(keyCode)) {
                cancelKeyPress = keyCode;
                if (!typer.consoleControl(keyCode)) {
                    return false;
                }
            }
        });
        
        ////////////////////////////////////////////////////////////////////////
        // Handle key press
        typer.keypress(function(e){
            var keyCode = e.keyCode || e.which;
            if (isIgnorableKey(e)) {
                return false;
            }
            if (acceptInput && cancelKeyPress != keyCode && keyCode >= 32){
                if (cancelKeyPress) return false;
                if (typeof config.charInsertTrigger == 'undefined' ||
                    (typeof config.charInsertTrigger == 'function' &&
                     config.charInsertTrigger(keyCode,promptText)))
                    typer.consoleInsert(keyCode);
            }
            if ($.browser.webkit) return false;
        });

        // Is a keycode a control character? 
        // E.g. up, down, left, right, backspc, return, etc.
        function isControlCharacter(keyCode){
            // TODO: Make more precise/fast.
            return (
                (keyCode >= keyCodes.left && keyCode <= keyCodes.down)
                    || keyCode == keyCodes.back || keyCode == keyCodes.del
                    || keyCode == keyCodes.end || keyCode == keyCodes.start
                    || keyCode == keyCodes.ret
            );
        };

        function isIgnorableKey(e) {
            // for now just filter alt+tab that we receive on some platforms when
            // user switches windows (goes away from the browser)
            return ((e.keyCode == keyCodes.tab || e.keyCode == 192) && e.altKey);
        };
        ////////////////////////////////////////////////////////////////////////
        // Handle console control keys
        // E.g. up, down, left, right, backspc, return, etc.
        typer.consoleControl = function(keyCode){
            switch (keyCode){
            case keyCodes.left:{ 
                moveColumn(-1);
                updatePromptDisplay(); 
                return false;
                break;
            }
            case keyCodes.right:{
                moveColumn(1); 
                updatePromptDisplay();
                return false;
                break; 
            }
            case keyCodes.back:{
                if (moveColumn(-1)){
                    deleteCharAtPos();
                    updatePromptDisplay();
                }
                return false;
                break;
            }
            case keyCodes.del:{
                if (deleteCharAtPos())
                    updatePromptDisplay();
                return false;
                break;
            }
            case keyCodes.end:{
                if (moveColumn(promptText.length-column))
                    updatePromptDisplay();
                return false;
                break;
            }
            case keyCodes.start:{
                if (moveColumn(-column))
                    updatePromptDisplay();
                return false;
                break;
            }
            case keyCodes.ret:{
                commandTrigger(); return false;
            }
            case keyCodes.up:{
                rotateHistory(-1); return false;
            }
            case keyCodes.down:{
                rotateHistory(1); return false;
            }
            default: //alert("Unknown control character: " + keyCode);
            }
        };

        ////////////////////////////////////////////////////////////////////////
        // Rotate through the command history
        function rotateHistory(n){
            if (history.length == 0) return;
            ringn += n;
            if (ringn < 0) ringn = history.length;
            else if (ringn > history.length) ringn = 0;
            var prevText = promptText;
            if (ringn == 0) {
                promptText = restoreText;
            } else {
                promptText = history[ringn - 1];
            }
            if (config.historyPreserveColumn) {
                if (promptText.length < column + 1) {
                    column = promptText.length;
                } else if (column == 0) {
                    column = promptText.length;
                }
            } else if (config.historyColumnAtEnd) {
                column = promptText.length;
            } else {
                column = 0;
            }
            updatePromptDisplay();
        };

        // Add something to the history ring
        function addToHistory(line){
            history.push(line);
            restoreText = '';
        };

        // Delete the character at the current position
        function deleteCharAtPos(){
            if (promptText != ''){
                promptText =
                    promptText.substring(0,column) +
                    promptText.substring(column+1);
                restoreText = promptText;
                return true;
            } else return false;
        };

        ////////////////////////////////////////////////////////////////////////
        // Validate command and trigger it if valid, or show a validation error
        function commandTrigger() {
            var line = promptText;
            if (typeof config.commandValidate == 'function') {
                var ret = config.commandValidate(line);
                if (ret == true || ret == false) {
                    if (ret) {
                        handleCommand();
                    }
                } else {
                    commandResult(ret,"jquery-console-message-error");
                }
            } else {
                handleCommand();
            }
        };

        // Scroll to the bottom of the view
        function scrollToBottom() {
            inner.attr({ scrollTop: inner.attr("scrollHeight") });;
        };

        ////////////////////////////////////////////////////////////////////////
        // Handle a command
        function handleCommand() {
            if (typeof config.commandHandle == 'function') {
		disableInput();
                addToHistory(promptText);
                var ret = config.commandHandle(promptText,function(msgs){
                    commandResult(msgs);
                });
                if (typeof ret == 'boolean') {
                    if (ret) {
                        // Command succeeded without a result.
                        commandResult();
                    } else {
                        commandResult('Command failed.',
                                      "jquery-console-message-error");
                    }
                } else if (typeof ret == "string") {
                    commandResult(ret,"jquery-console-message-success");
                } else if (typeof ret == 'object' && ret.length) {
                    commandResult(ret);
                }
            }
        };

        ////////////////////////////////////////////////////////////////////////
        // Disable input
	function disableInput() {
	    acceptInput = false;
	};

        // Enable input
	function enableInput() {
	    acceptInput = true;
	}

        ////////////////////////////////////////////////////////////////////////
        // Reset the prompt in invalid command
        function commandResult(msg,className) {
            column = -1;
            updatePromptDisplay();
            if (typeof msg == 'string') {
                message(msg,className);
            } else {
                for (var x in msg) {
                    var ret = msg[x];
                    message(ret.msg,ret.className);
                }
            }
            newPromptBox();
        };

        ////////////////////////////////////////////////////////////////////////
        // Display a message
        function message(msg,className) {
            var mesg = $('<div class="jquery-console-message"></div>');
            if (className) mesg.addClass(className);
            mesg.filledText(msg).hide();
            inner.append(mesg);
            mesg.show();
        };

        ////////////////////////////////////////////////////////////////////////
        // Handle normal character insertion
        typer.consoleInsert = function(keyCode){
            // TODO: remove redundant indirection
            var char = String.fromCharCode(keyCode);
            var before = promptText.substring(0,column);
            var after = promptText.substring(column);
            promptText = before + char + after;
            moveColumn(1);
            restoreText = promptText;
            updatePromptDisplay();
        };
        
        ////////////////////////////////////////////////////////////////////////
        // Move to another column relative to this one
        // Negative means go back, positive means go forward.
        function moveColumn(n){
            if (column + n >= 0 && column + n <= promptText.length){
                column += n;
                return true;
            } else return false;
        };

        extern.promptText = function(text){
            if (text) {
                promptText = text;
                if (column > promptText.length)
                    column = promptText.length;
                updatePromptDisplay();
            }
            return promptText;
        };

        ////////////////////////////////////////////////////////////////////////
        // Update the prompt display
        function updatePromptDisplay(){
            var line = promptText;
            var html = '';
            if (column > 0 && line == ''){
                // When we have an empty line just display a cursor.
                html = cursor;
            } else if (column == promptText.length){
                // We're at the end of the line, so we need to display
                // the text *and* cursor.
                html = htmlEncode(line) + cursor;
            } else {
                // Grab the current character, if there is one, and
                // make it the current cursor.
                var before = line.substring(0, column);
                var current = line.substring(column,column+1);
                if (current){
                    current = 
                        '<span class="jquery-console-cursor">' +
                        htmlEncode(current) +
                        '</span>';
                }
                var after = line.substring(column+1);
                html = htmlEncode(before) + current + htmlEncode(after);
            }
            prompt.html(html);
            scrollToBottom();
        };
        
        // Simple HTML encoding
        // Simply replace '<', '>' and '&'
        // TODO: Use jQuery's .html() trick, or grab a proper, fast
        // HTML encoder.
        function htmlEncode(text){
            return (
                text.replace(/&/g,'&amp;')
                    .replace(/</g,'&lt;')
                    .replace(/</g,'&lt;')
                    .replace(/ /g,'&nbsp;')
                    .replace(/([^<>&]{10})/g,'$1<wbr>&shy;' + wbr)
            );
        };

        return extern;
    };
    // Simple utility for printing messages
    $.fn.filledText = function(txt){
        $(this).text(txt);
        $(this).html($(this).html().replace(/\n/g,'<br/>'));
        return this;
    };
})(jQuery);
