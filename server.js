const express = require('express');
const app = express();
const server = require('http').createServer(app);
const util = require('util');
var mysql = require('mysql');
const { v4: uuidv4 } = require('uuid');
const e = require('express');
const DB_LOGIN = {
  host     : '153.92.6.64',
  user     : 'u749943542_admin',
  password : 'AntonioTavarez0',
  database : 'u749943542_eventappdb'
}
const io = require('socket.io')(server, {
  cors: {
      origin: "*",
      methods: ["GET", "POST"],
      transports: ['websocket', 'polling'],
      credentials: true
  },
  allowEIO3: true
});
const PORT = process.env.PORT || 5000;


//When a user connects
io.on('connection', (socket) => {
    console.log("A user has connected");
    //Server recieves a message from ongoing conversation
    socket.on('message', async (data) => {
      let convoId = data['convoId'];
      let message = data['message'];
      message['messageId'] = '0x' + uuidv4().replace(/-/g, "");
      io.emit('message', data);
      let connection = mysql.createConnection(DB_LOGIN);
      //Send message to conversation
      sendMessageDB(convoId, message, connection);
      connection.end();
    });

    //Server receives a new message from 'New message page'
    socket.on('newMessage', async (data) =>  {
      conversation = data['conversation'];
      eventId = data['eventId'];
      message = data['message'];
      membersId = conversation['members'].map(m => m['userid']);
      let connection = mysql.createConnection(DB_LOGIN);
      //Check if conversation type is public
      if(conversation['type'] != 'public') {
        //If not: check if a conversation with the same people already exists
        res1 = await checkConversation(membersId, eventId, connection);
        //If conversation already exists
        if(res1['res']) {
          //Send message to conversation
          sendMessageDB(res1['rows'][0], message, connection)
        } else {
          conversation['convoId'] = '0x' + uuidv4().replace(/-/g, "");
          let res2 = await addConversation(conversation, eventId, connection);
          io.emit('newConvo', conversation);
          if(res2 == 1) {
            addGroup(conversation, connection);
            message['messageId'] = '0x' + uuidv4().replace(/-/g, "");
            sendMessageDB(conversation['convoId'], message, connection);
          }
        }
      } else {
        //If so: create new conversation
        conversation['convoId'] = '0x' + uuidv4().replace(/-/g, "");
        let res2 = await addConversation(conversation, eventId, connection);
        console.log('from main: '+ JSON.stringify(res2));
        //Add message to new conversation
        if(res2 == 1) {
          addGroup(conversation, connection);
          message['messageId'] = '0x' + uuidv4().replace(/-/g, "");
          sendMessageDB(conversation['convoId'], message, connection);
        }
      }
      connection.end();
    });

    socket.on("connect_error", (err) => {
      console.log(`connect_error due to ${err.message}`);
    });
});



app.get('/', (req, res) => {
    res.send('Hello World!')
  })



const newId = "LOWER(CONCAT('0x',REPLACE(UUID(),'-','')))";

function id(type){
    return "LOWER(CONCAT('0x',HEX("+type+")))";
}
  
function tableId(table, type){
    return "LOWER(CONCAT('0x',HEX("+table+"."+type+")))";
}



function sendMessageDB(convoid, message, connection) {
  console.log(JSON.stringify(message));
  let convoId = convoid.substring(2);
  let messageId = message['messageId'].substring(2);
  let sentBy = message['sentBy'].substring(2);
  const query = util.promisify(connection.query).bind(connection);
  res =  query(`INSERT INTO messages (messageid, convoid, sentBy, content, isSeen, sentAt)
                VALUES (UNHEX('${messageId}'), UNHEX('${convoId}'), UNHEX('${sentBy}'), ?, ?, CURRENT_TIMESTAMP)`,
                [message['content'], message['isSeen']]);
console.log('send message res: '+JSON.stringify(res));
}

async function checkConversation(membersId, eventId, connection) {
  let gcid = tableId('g', 'convoid');
  let guid = tableId('g', 'userid');
  let list = '?, '.repeat(membersId.length -1) + '?';
  let req =`SELECT ${gcid} as convoId, ${guid} as userId
        FROM groups AS g
        JOIN conversations AS c on g.convoid = c.convoid
        WHERE g.userid IN (${list}) AND c.eventid = ? AND c.type <> 'public'
        GROUP BY convoId
        HAVING COUNT(userId) = ?;`;
  const query = util.promisify(connection.query).bind(connection);
  try{
    res = await query(req, [...membersId, eventId, membersId.length]);
    console.log('check convo res: '+JSON.stringify(res));
    let data = {
      "res": !res.length? false: true,
      "rows": res};
    return data;
  } catch(err){ console.log(err); }
}

async function addConversation(conversation, eventId, connection) {
  let req =`INSERT INTO conversations (convoid, eventid, title, type, updatedAt)
            VALUES (UNHEX('${conversation['convoId'].substring(2)}'), UNHEX('${eventId.substring(2)}'), ?, ?, CURRENT_TIMESTAMP)`;
  const query = util.promisify(connection.query).bind(connection);
  try{
    res = await query(req, [conversation['title'], conversation['type']]);
    console.log('add convo res: '+JSON.stringify(res));
    return res['affectedRows'];
  } catch(err){ console.log(err); }
}

//Add an entry to groups for each member of the conversation
async function addGroup(conversation, connection){
  let req =`INSERT INTO groups (convoid, userid) VALUES `;
  for(let member of conversation["members"]){
    let values = `(UNHEX('${conversation['convoId'].substring(2)}'), UNHEX('${member['userid'].substring(2)}')), `;
    req = req + values;
  }
  let finalReq = req.substring(0, req.length -2);
  const query = util.promisify(connection.query).bind(connection);
  try {
    res = await query(finalReq);
    console.log('add group res: '+JSON.stringify(res));
  } catch(err) { console.log(err); }
}


  

server.listen(PORT, () => console.log(`server started on port ${PORT}`));