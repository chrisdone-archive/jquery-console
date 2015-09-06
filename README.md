# jquery-console

A terminal emulator for making command consoles written in JavaScript
with jQuery.

See
[LICENSE](https://github.com/chrisdone/jquery-console/blob/master/LICENSE)
for the license.

## Example

For a list of examples, see
[the demo file](https://github.com/chrisdone/jquery-console/blob/master/demo.html),
and for a live demo, see
[live demo](http://chrisdone.com/jquery-console/) on my home page.

Simple example:

``` javascript
var container = $('<div class="console">');
$('body').append(container);
var controller = container.console({
  promptLabel: 'Demo> ',
  commandValidate:function(line){
    if (line == "") return false;
    else return true;
  },
  commandHandle:function(line){
      return [{msg:"=> [12,42]",
               className:"jquery-console-message-value"},
              {msg:":: [a]",
               className:"jquery-console-message-type"}]
  },
  autofocus:true,
  animateScroll:true,
  promptHistory:true,
  charInsertTrigger:function(keycode,line){
     // Let you type until you press a-z
     // Never allow zero.
     return !line.match(/[a-z]+/) && keycode != '0'.charCodeAt(0);
  }
});
```

Some CSS for your console:

``` css
div.console { font-size: 14px }
div.console div.jquery-console-inner
 { width:900px; height:200px; background:#333; padding:0.5em;
   overflow:auto }
div.console div.jquery-console-prompt-box
 { color:#fff; font-family:monospace; }
div.console div.jquery-console-focus span.jquery-console-cursor
 { background:#fefefe; color:#333; font-weight:bold }
div.console div.jquery-console-message-error
 { color:#ef0505; font-family:sans-serif; font-weight:bold;
   padding:0.1em; }
div.console div.jquery-console-message-value
 { color:#1ad027; font-family:monospace;
   padding:0.1em; }
div.console div.jquery-console-message-type
 { color:#52666f; font-family:monospace;
   padding:0.1em; }
div.console span.jquery-console-prompt-label { font-weight:bold }
```

## Usage options

Here are options which can be passed to `console`:

| Option                | Type     | Description
| -----------           | -------- | ------
| autofocus             | bool     | Autofocus the terminal, rather than having to click on it.
| promptHistory         | bool     | Provide history support (kind of crappy, needs doing properly.)
| historyPreserveColumn | bool     | Preserve the column you were one when switching between history.
| welcomeMessage        | string   | Just a first message to display on the terminal.
| promptLabel           | string   | Prompt string like `'JavaScript> '`.
| cols                  | integer  | The number of cols, this value is only used by the command completion to format the list of results.
| commandValidate       | function | When user hits return, validate whether to trigger commandHandle and re-prompt.
| commandHandle         | function | Handle the command line, return a string, boolean, or list of `{msg:"foo",className:"my-css-class"}`. `commandHandle(line,report)` is called. Report function is for you to report a result of the command asynchronously.
| completeHandle        | function | Handle the command completion when the tab key is pressed. It returns a list of string completion suffixes.
| completeIssuer        | function | Handle the command completion when the tab key is pressed. It differs from `'completeHandle'`. `'completeIssuer'` will just trigger the calculation for completion, and the result is returned asynchronously, after which the controller's `'showCompletion(promptText, completions)'` can be invoked with the result. `'completeHandle'` will retrieve the result synchronously, and show the result. If `'completeHandle'` exists, `'completeIssuer'` is ignored. A typical usage of `'completeIssuer'` is that the completion is retrieved from the server using ajax or WebSocket asynchronously. 
| animateScroll         | bool     | Whether to animate the scroll to top. Currently disabled.
| charInsertTrigger     | function | Predicate for whether to allow character insertion. `charInsertTrigger(char,line)` is called.
| cancelHandle          | function | Handle a user-signaled interrupt.
| fadeOnReset           | bool     | Whether to trigger a fade in/out when the console is reset.  Defaults to `true`.

## Uses in the wild

* [Try Haskell](http://tryhaskell.org/)
* [Try Idris](http://www.tryidris.org/console)
* [Caja](http://code.google.com/p/google-caja/)
* [Try Clojure](http://tryclj.com/)
* [Try Arc](http://tryarc.org/)
* [Try Github](http://try.github.io/) (was, now uses [CodeMirror](http://codemirror.net/))
