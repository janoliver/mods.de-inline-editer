//-*- coding: utf-8 -*-

// (c) 2012 by Oli

// this variable set to true fetches the thread's
// xml document on page load and caches it.
var preload_xml = false;

var html_location = document.URL;
var base_url = html_location.split("/")[2];
var xml_location  = html_location.replace(/thread\.php/, "xml/thread.php");

var xml = null;

function getXml() {
    // fetch xml of this thread synchroneously
    $.ajax({
        url:xml_location, 
        type: 'GET',
        async: false,
        success: function(response) {
            xml = response;
        }
    })
};

if(preload_xml)
    getXml();

// needed for some encoding differences between jquery
// and the website
function escapeForQuery(str) {
    return escape(str).replace(/\+/g, "%2B");
}

// doubleclick event on some post
$('.posttext').parent().live('dblclick', function(e) {
    e.preventDefault();

    var tab = $(this).parent().parent().parent();

    if(!preload_xml)
        getXml();

    if(xml == null)
        return false;

    // find post id
    var temp = tab.parents('[username]').next().find('a[href*="PID"]').attr('href');
    var pid  = temp.match(/PID=([0-9]+)/)[1];
    var tid  = temp.match(/TID=([0-9]+)/)[1];

    // find the correct post in the thread's xml file
    var xmlNode = $('post[id="'+pid+'"]', xml);

    // check if user is allowed to edit this anyway
    if(xmlNode.find('token-editreply').length < 1)
        return false;

    // remove the post
    tab.hide();
    var title = $('<input type="text" class="bordered" name="title" id="pstt" maxlength="50">').width(250);
    var textarea = $('<textarea id="pstmsg"></textarea>').width('100%').height(200);
    var button = $('<input type="submit" name="submit" value="Eintragen" accesskey="s">').width(150);
    var cancel_button = $('<input type="button" name="cancel" value="Abbrechen">').width(150);
    tab.parent().append(title).append(textarea).append(button).append(cancel_button);

    // insert the post text
    textarea.val(xmlNode.find('content').text());
    title.val(xmlNode.find('title').text());
    
    // cancel.
    cancel_button.click(function() {
        tab.find('textarea, input').remove();
        td.show();
    });

    // on button click, send new content to server.
    button.click(function(e) {
        e.preventDefault();
        
        // the data to be sent
        var sendData = {
            'token' : xmlNode.find('token-editreply').attr('value'),
            'edit_title': title.val(),
            'message': textarea.val(),
            'PID': pid,
            'TID': tid,
            'submit': 'Eintragen'
        }

        // prepare data for query
        var queryString = "";
        $.each(sendData, function(key, val) {
            queryString += "&" + key + "=" + escapeForQuery(val);
        });

        // send data and edit post
        $.ajax({
            url: 'http://'+ base_url +'/bb/editreply.php', 
            data: queryString, 
            type: 'POST',
            processData: false,
            success: function() {
            
                // ok, success, now get the new post's html...
                $.get(html_location, function(response) {
                    var new_html = $(response).find('a[name="reply_' + pid + '"]')
                        .parents('[username]').find('table:has(.posttext)').html();
                    
                    tab.parent().find('textarea, input').remove();
                    tab.css({'background-color':'#394E63'}).html(new_html).show();
                    tab.effect("highlight", {}, 1000);
                });

                // refresh cached xml
                $.get(xml_location, function(response) {
                    xml = response;
                });
            },
            contentType: "application/x-www-form-urlencoded",
            dataType: 'html'
        });
    });
});