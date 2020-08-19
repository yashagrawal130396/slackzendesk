// Create a Slack app and add scope app_mentions:read in it.
// Enable events and add your code's deployement URL in slack app's event url.

function doPost(e) {
  // Fetching data sent by slack app on app mention event.
  var data = JSON.parse(e.postData.contents);
  var zen_header = {'Content-Type': 'application/json',
             "Authorization" : "Basic YOUR_ZENDESK_AUTHORIZATION_TOKEN",            
             };
  
  // Specifying event type (Used in case where app has other events as well)
  if(data.event.type == 'app_mention') {
    var eventts = data.event.event_ts;
    var channel = data.event.channel;
    var user = data.event.user;
    var ping_text = data.event.text;
    ping_text = String(ping_text).replace("\n","<br>");
    
    // Accessing slack user list to fetch email id of the user who mentioned the app.
    var user_url = 	'https://slack.com/api/users.list';
    var user_payload = {
      'token':'YOUR_SLACK_AUTHORIZATION_TOKEN'
    };
    var user_options = {
      'method':'get',
      'payload':user_payload,
    };
    // Getting user email from slack so that ticket can be created on this user's behalf.
    var user_data = JSON.parse(UrlFetchApp.fetch(user_url, user_options));
    for(var k = 1 ; k<user_data.members.length;k++){  
      if(user == user_data.members[k].id) {
        var user_email = user_data.members[k].profile.email;
        break;
      }
    }
    
    // Zendesk ticket creation with the data sent by slack ping along with the eventts and channel so that to & fro communication can be done using this on slack again.
    var zen_create_url = 'https://headout.zendesk.com/api/v2/tickets.json';
    var zen_create = {
    "ticket": {
        "subject": "New slot closure request",
        "comment": {
         "html_body": ping_text
          },
          "tags": ["slot_closure"],
          "requester": user_email,
          "custom_fields": [{ "id": 360021471852, "value": eventts },{ "id": 360021472412, "value": channel }],
          "external_id": eventts
      }
    };

    var zen_create_options = {
        "method": "POST",
        "contentType":"application/json",
        "headers" : zen_header,
        "payload" : JSON.stringify(zen_create)
          };
    var create_res = JSON.parse(UrlFetchApp.fetch(zen_create_url, zen_create_options));
    var ticket_id = create_res.ticket.id;
    
    // As soon as ticket is created, pasting a msg on the same slack thread along with the the ticket url.
    var first_msg_payload = {
      'token':'xoxb-2316821691-987143998967-ozSTRQJZfbWG81IQlmrgQPa1',
      'channel': channel,
      'thread_ts': eventts,
      'text': 'Ticket created successfully <https://headout.zendesk.com/agent/tickets/'+ticket_id+'|Ticket #'+ticket_id+'>',
      'username':'Ping Bot',
      'icon_emoji':':robot_face:'
    }
    var first_msg_url = 'https://slack.com/api/chat.postMessage';
    var first_msg_options = {
      "method": "POST",
      "content-type":"application/json",
      "payload" : first_msg_payload
          };
    var first_msg_res = UrlFetchApp.fetch(first_msg_url, first_msg_options);
     
  }
  // Further sending msgs of the same slack thread to the same zendesk ticket
  else if(data.event.type == 'message') {
    var check = JSON.stringify(data.event);
    if(check.indexOf('bot_id') > -1 || check.indexOf('bot_profile') > -1) {
      return ;
    }
    // Using the threadts to identify the zendesk ticket by using external id which was setup while ticket creation namely eventts
    else if(check.indexOf('thread_ts') > -1) {
      var threadts = data.event.thread_ts;
      var update_text = data.event.text;
      var external_id_url = 'https://headout.zendesk.com/api/v2/tickets.json?external_id=' + threadts;
      var external_id_options = {
        "method": "GET",
        "contentType":"application/json",
        "headers" : zen_header
          };
      var external_res = JSON.parse(UrlFetchApp.fetch(external_id_url, external_id_options));
      var external_ticket_id = external_res.tickets[0].id;
      
      var update_ticket_url = 'https://headout.zendesk.com/api/v2/tickets/' +external_ticket_id + '.json';
      var zen_update = {
        "ticket": {
        "comment": {
         "html_body": update_text
          }
        }
      };
      var update_ticket_options = {
        "method": "PUT",
        "contentType":"application/json",
        "headers" : zen_header,
        "payload" : JSON.stringify(zen_update)
          };
      var update_res = UrlFetchApp.fetch(update_ticket_url, update_ticket_options);
    }
    else { return; }
  }
  else { return; }
return ;
}
