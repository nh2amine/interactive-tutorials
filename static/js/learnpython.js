var editor;
var output;
var originalCode;
var loading;
var minimized = false;

(function( jQuery ) {

if ( window.XDomainRequest ) {
	jQuery.ajaxTransport(function( s ) {
		if ( s.crossDomain && s.async ) {
			if ( s.timeout ) {
				s.xdrTimeout = s.timeout;
				delete s.timeout;
			}
			var xdr;
			return {
				send: function( _, complete ) {
					function callback( status, statusText, responses, responseHeaders ) {
						xdr.onload = xdr.onerror = xdr.ontimeout = jQuery.noop;
						xdr = undefined;
						complete( status, statusText, responses, responseHeaders );
					}
					xdr = new XDomainRequest();
					xdr.open( s.type, s.url );
					xdr.onload = function() {
						callback( 200, "OK", { text: xdr.responseText }, "Content-Type: " + xdr.contentType );
					};
					xdr.onerror = function() {
						callback( 404, "Not Found" );
					};
					if ( s.xdrTimeout ) {
						xdr.ontimeout = function() {
							callback( 0, "timeout" );
						};
						xdr.timeout = s.xdrTimeout;
					}
					xdr.send( ( s.hasContent && s.data ) || null );
				},
				abort: function() {
					if ( xdr ) {
						xdr.onerror = jQuery.noop();
						xdr.abort();
					}
				}
			};
		}
	});
}
})( jQuery );

function recordOutboundLink(link, category, action) {
	_gat._getTrackerByName()._trackEvent(category, action);
	setTimeout('document.location = "' + link.href + '"', 100);
}

function eval_console(code) {
	var original_log = console.log;
	var text = "";
	console.log = function(line) {
		text += line + "\n";
	};
	eval(code);
	console.log = original_log;
	return text;
}

function compareHTML(a, b) {
	// TODO - check CSS
	// TODO - check head

	if (a.children.length != b.children.length) {
		return false;
	}

	for (var i = 0; i < a.children.length; i++) {
		// first check that the tag name is similar
		if (a.children[i].tagName != b.children[i].tagName) {
			return false;
		}

		// check attributes - TODO
		if (a.children[i].attributes.length != b.children[i].attributes.length) {
			return false;
		}

		for (var j = 0; j < a.children[i].attributes.length; j++) {
			var attribute = a.children[i].attributes[j].name;
			if (a.children[i].attributes[attribute].value != b.children[i].attributes[attribute].value) {
				return false;
			}
		}

		if (a.children[i].children.length == 0) {
			if (a.children[i].innerHTML != b.children[i].innerHTML) {
				return false;
			}
		} else {
			if (!compareHTML(a.children[i], b.children[i])) {
				return false;
			}
		}
	}

	return true;
}

function execute() {
	toggleMinimize(true);

	if (window.domainData.language == "html") {
		$("#html-output").show();
		$("#text-output").hide();

		var a = $("#expected-output").contents()[0];
		a.write(tutorialData.output);
		a.close();

		var b = $("#html-output").contents()[0];
		b.write(editor.getValue());
		b.close();

		// now, let's compare A and B
		if (compareHTML(a.body, b.body)) {
			correct();
		}

		// links should not redirect us out of here.
		var links = b.querySelectorAll("a");
		for (var i = 0; i < links.length; i++) {
			if (links[i].href.indexOf("#") == -1) {
				links[i].target = "_blank";
			}
		}

		return;
	}

	//$('#output').css('color', '#bbbbbb');
	//$('#output').css('background-color', '#eeeeee');
	loading.show();
	output.setValue("");
	//$('#output').text('');

	if (window.domainData.language == "javascript") {
		try {
			print(eval_console(editor.getValue()));
		} catch(err) {
			print(err.message);
		}
	} else {
		$.ajax({
			type : "post",
			data : JSON.stringify({
				"code" : editor.getValue(),
				"language" : window.domainData.language
			}),
			contentType : "application/json",
			success : execDone,
			error : handleError,
			dataType: "json"
		});
	}

}

function execDone(data) {
	loading.hide();
	//$('#output').css('background-color', 'white');
	if (data["output"] == "exception") {
		//$('#output').css('color', 'red');
	} else {
		//$('#output').css('color', 'black');
	}
	if (data["output"] == "text" || data["output"] == "exception") {
		//$("#output").show();
		//$("#canvas_container").hide();
		print(data["text"]);
	}
}

function handleError(data) {
	//$('#output').css('color', 'black');
	//$('#output').css('background-color', 'white');
	if (data.status == 0) {
		print("There was an unknown error!");
	} else {
		print(data["text"]);
	}
}

function correct() {
	bootbox.confirm("Correct! Click OK to move on to the next chapter.", function(success) {
		if (success) {
			document.location.href = nextChapter;
		}
	});
}

function print(text) {
	output.setValue(text);
	if ($.trim(tutorialData.output) != '' && $.trim(tutorialData.output) == $.trim(text)) {
		correct();
	}
}

function load() {
	loading = $("#loading");
	var codeBlocks = $("code");
	// TODO: make syntax highlighting generic by matching language codes with prism codes

	switch (window.domainData.language) {
		case "python":
			editor = CodeMirror.fromTextArea(document.getElementById("code"), {
				mode: {name: "python",
					version: 2,
					singleLineStringErrors: false},
				lineNumbers: true,
				indentUnit: 4,
				tabMode: "shift",
				theme: "monokai"
			});

			codeBlocks.addClass("language-python");
			Prism.highlightAll();

			break;
		case "java":
			editor = CodeMirror.fromTextArea(document.getElementById("code"), {
				lineNumbers: true,
				indentUnit: 4,
				tabMode: "shift",
				mode: "text/x-java",
				theme: "monokai"
			});

			codeBlocks.addClass("language-java");
			Prism.highlightAll();

			break;
		case "c":
			editor = CodeMirror.fromTextArea(document.getElementById("code"), {
				lineNumbers: true,
				indentUnit: 4,
				tabMode: "shift",
				mode: "text/x-csrc",
				theme: "monokai"
			});

			codeBlocks.addClass("language-c");
			Prism.highlightAll();

			break;
		case "c++11":
			editor = CodeMirror.fromTextArea(document.getElementById("code"), {
				lineNumbers: true,
				indentUnit: 4,
				tabMode: "shift",
				mode: "text/x-csrc",
				theme: "monokai"
			});

			codeBlocks.addClass("language-cpp");
			Prism.highlightAll();

			break;
		case "javascript":
			editor = CodeMirror.fromTextArea(document.getElementById("code"), {
				lineNumbers: true,
				indentUnit: 4,
				tabMode: "shift",
				mode: "text/javascript",
				theme: "monokai"
			});

			codeBlocks.addClass("language-javascript");
			Prism.highlightAll();

			break;
		case "ruby":
			editor = CodeMirror.fromTextArea(document.getElementById("code"), {
				lineNumbers: true,
				indentUnit: 4,
				tabMode: "shift",
				mode: "text/x-ruby",
				theme: "monokai"
			});

			codeBlocks.addClass("language-ruby");
			Prism.highlightAll();

			break;
		case "bash":
			editor = CodeMirror.fromTextArea(document.getElementById("code"), {
				lineNumbers: true,
				indentUnit: 4,
				tabMode: "shift",
				mode: "text/x-sh",
				theme: "monokai"
			});

			codeBlocks.addClass("language-bash");
			Prism.highlightAll();

			break;
		case "perl":
			editor = CodeMirror.fromTextArea(document.getElementById("code"), {
				lineNumbers: true,
				indentUnit: 4,
				tabMode: "shift",
				mode: "text/x-perl",
				theme: "monokai"
			});

			codeBlocks.addClass("language-perl");
			Prism.highlightAll();

			break;

		case "php":
			editor = CodeMirror.fromTextArea(document.getElementById("code"), {
				lineNumbers: true,
				indentUnit: 4,
				tabMode: "shift",
				mode: "application/x-httpd-php",
				theme: "monokai"
			});

			codeBlocks.addClass("language-php");
			Prism.highlightAll();

			break;

		case "c#":
			editor = CodeMirror.fromTextArea(document.getElementById("code"), {
				lineNumbers: true,
				indentUnit: 4,
				tabMode: "shift",
				mode: "text/x-csharp",
				theme: "monokai"
			});

			codeBlocks.addClass("language-csharp");
			Prism.highlightAll();

			break;

		case "html":
			editor = CodeMirror.fromTextArea(document.getElementById("code"), {
				lineNumbers: true,
				indentUnit: 4,
				tabMode: "shift",
				mode: "text/html",
				theme: "monokai"
			});

			codeBlocks.addClass("language-html");
			Prism.highlightAll();

			break;
	}

	output = CodeMirror.fromTextArea(document.getElementById("output"), {
		lineNumbers: false,
		textWrapping: true,
		readOnly : true,
		theme: "monokai",
        mode: "text/plain"
	});

    originalCode = editor.getValue();

    $("#inner-text pre").after(
        $("<a>").addClass("btn btn-small btn-success execute-code").text("Execute Code").click(function() {
            var text = $(this).prev().text();
            if (window.domainData.container_word && text.indexOf(window.domainData.container_word) == -1) {
                var lines = text.split("\n");
                var indentedText = "";
                for (var i = 0; i < lines.length; i++) {
                    indentedText += window.domainData.container_indent + lines[i] + "\n";
                }
                text = window.domainData.container.replace("{code}", indentedText);

            }
			toggleMinimize(true);
            editor.setValue(text);
			execute();
        })
    );

}

function showExpected() {
	toggleMinimize(true);
	output.setValue(tutorialData.output);
}

function showSolution() {
	toggleMinimize(true);
    var solutionText = tutorialData.solution;
    if (solutionText) {
    	editor.setValue(solutionText);
    } else {
        editor.setValue("There is currently no solution to this exercise.\nPlease contribute your solution on GitHub.\n\nhttp://github.com/ronreiter/interactive-tutorials");
        $("#run-button").prop("disabled", true);
    }
}

function reset() {
	toggleMinimize(true);
    $("#run-button").prop("disabled", false);
	editor.setValue(originalCode);
}

function toggleMinimize(maximizeOnly) {
	if (maximizeOnly && !minimized) return;
	if (minimized) {
		$(".footer-toggle").show();
		editor.setValue(originalCode);
		$("#minimize-button").text("Minimize Window").removeClass("btn-success");
	} else {
		$(".footer-toggle").hide();
		$("#minimize-button").text("Show Window").addClass("btn-success");
	}

	minimized = !minimized;
	if (minimized) {
		$("footer").addClass("minimized");
		$("footer").removeClass("maximized");
	} else {
		$("footer").addClass("maximized");
		$("footer").removeClass("minimized");
	}

}

$(function() {
	load();
});