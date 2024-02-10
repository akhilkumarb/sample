const express = require('express')
const app = express()
const bodyParser = require('body-parser')
var csrf = require("tiny-csrf")
app.use('/images', express.static('images'));
const passport=require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session =  require("express-session");
const LoacalStrategy = require("passport-local")
const bcrypt=require("bcrypt")
const saltRounds = 10
const {trackEvents,AllEvents,  User } = require('./models')


var cookieParser = require("cookie-parser")
app.use(bodyParser.json())
app.set('views', './views');
const path=require("path");
app.use(express.urlencoded({extended:false}));
app.use(cookieParser("shh! some secret string"))
app.use(csrf("this_should_be_32_character_long",["POST","PUT","DELETE"]))

app.set("view engine","ejs");
app.use(express.static(path.join(__dirname,"public")));

app.use(session({
  secret:"my_super_secret_key_123456789",
  cookie:{
    maxAge:24*60*60*1000 
  }
}))


app.use(passport.initialize());
app.use(passport.session());

passport.use(new LoacalStrategy({
  usernameField:'email',
  passwordField:'password'
},(username,password,done)=>{
  console.log(username);
  User.findOne({
    where:{
      email:username
    }
  }).then(async (user)=>{
    const result = await bcrypt.compare(password,user.password)
    if(result){
      return done(null,user);
    }
    else{
      return done("Invalid Email/password")
    }
  }).catch((err)=>{
    return (err)
  })
})

)

passport.serializeUser((user,done)=>{
  console.log("Serilalizing user in session",user.id)
  done(null,user.id)
})

passport.deserializeUser((id,done)=>{
  User.findByPk(id)
  .then(user=>{
    done(null,user)
  }).catch(err=>{
    done(err,null)
  })
})

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/login'); 
  }
};

// runs during running Localhost:port/login
app.get("/login",(request,response)=>{
    response.render("studentLogin",{title:"Login", csrfToken:request.csrfToken()})

})

//runs during submission of login button
app.post("/login", passport.authenticate('local',{failureRedirect:"/login"}),(request,response)=>{
  console.log(request.user.email);
  if(request.user.email==="admin@gmail.com"){
    response.redirect("/admindashBoard");
  }
  else{
    response.redirect("/dashBoard")
  }
})

//localhost:port/signUp
app.get("/signUp",(request,response)=>{
  response.render("studentSignup",{title:"Signup",csrfToken: request.csrfToken()})
})

//submission of signUp
app.post("/signUp", async(request,response)=>{
const hashedPwd = await  bcrypt.hash(request.body.password,saltRounds)
try{
  const user=await User.create({
    firstName: request.body.FullName,
    lastName: request.body.lastName,
    email:request.body.email,
    password:hashedPwd,
  })
  request.login(user,(err)=>{
     if(err){
        console.log(err);
     }
     response.redirect("/")
  })
}
catch(err){
  console.log(err)
}

})


//users dashBoard
app.get('/dashBoard', isAuthenticated,async (request, response) => {
  try {
    const EventData = await AllEvents.findAll();
    const FormattedEventData = EventData.map(EventData => ({
    id: EventData.id,
    UserId: EventData.UserId,
    eventImg: EventData.eventImg,
    eventTitle: EventData.eventTitle,
    eventDesc: EventData.eventDesc,
    eventVenue: EventData.eventVenue,
    eventCapacity: EventData.eventCapacity,
    eventStartDate: EventData.eventStartDate,
    eventTime: EventData.eventTime,
    eventEndDate: EventData.eventEndDate,
    createdAt: EventData.createdAt,
    updatedAt: EventData.updatedAt,
    }));
      response.render('dashBoard', { title: 'dashBoard',name: request.user.firstName ,user: request.user.email,FormattedEventData,  csrfToken: request.csrfToken() });

}
catch(err){
  console.log(err);
    response.status(500).send('Internal Server Error');
}
});


//Admin's DashBoard
app.get('/admindashBoard', isAuthenticated,async (request,response) => {
  try {
    const EventData = await AllEvents.findAll();
    const FormattedEventData = EventData.map(EventData => ({
    id: EventData.id,
    UserId: EventData.UserId,
    eventImg: EventData.eventImg,
    eventTitle: EventData.eventTitle,
    eventDesc: EventData.eventDesc,
    eventVenue: EventData.eventVenue,
    eventCapacity: EventData.eventCapacity,
    eventStartDate: EventData.eventStartDate,
    eventTime: EventData.eventTime,
    eventEndDate: EventData.eventEndDate,
    createdAt: EventData.createdAt,
    updatedAt: EventData.updatedAt,
    }));
      response.render('admindashBoard', { title: 'dashBoard',name: request.user.firstName ,user: request.user.email,FormattedEventData,  csrfToken: request.csrfToken() });

}
catch(err){
  console.log(err);
    response.status(500).send('Internal Server Error');
}
})

//Live Events
app.get('/AllEvents', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  
  try {
    const EventData = await AllEvents.findAll();
    const FormattedEventData = EventData.map(EventData => ({
    id: EventData.id,
    UserId: EventData.UserId,
    eventImg: EventData.eventImg,
    eventTitle: EventData.eventTitle,
    eventDesc: EventData.eventDesc,
    eventVenue: EventData.eventVenue,
    eventCapacity: EventData.eventCapacity,
    eventStartDate: EventData.eventStartDate,
    eventTime: EventData.eventTime,
    eventEndDate: EventData.eventEndDate,
    createdAt: EventData.createdAt,
    updatedAt: EventData.updatedAt,
    }));
    if(request.user.email==="admin@gmail.com"){
      response.render('AdminEvents', { title: 'AllEvents',name: request.user.firstName ,user: request.user.email,FormattedEventData,  csrfToken: request.csrfToken() });
    }
    else{
      response.render('AllEvents', { title: 'AllEvents',name: request.user.firstName ,user: request.user.email,FormattedEventData,  csrfToken: request.csrfToken() });
    }

    
  } catch (error) {
    console.error('Error fetching todos:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
  
});


//add Events only admin
app.get('/addEvent', connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  response.render('addEvent', { title: 'Signup', csrfToken: request.csrfToken() });
});


//submission od Adding event
app.post('/addEvent', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const userX=request.user.email;
    console.log("heyyyyyy"+request.user.id)
    console.log("heyyyyyy"+ typeof request.user.id)
    const event = await AllEvents.create({
      UserId: request.user.id, 
      eventImg: request.body.EventImg,
      eventTitle: request.body.EventTitle,
      eventDesc: request.body.content,
      eventVenue: request.body.EventLocation,
      eventCapacity: request.body.EventMemebers,
      eventStartDate: request.body.EventStartDate,
      eventTime: request.body.EventTime,
      eventEndDate: request.body.EventEndDate,
    });

    response.redirect('/addEvent' );
  } catch (err) {
    console.log(err);
    response.status(500).send('Internal Server Error');
  }
});



//View Events 
app.get('/viewEvent', connectEnsureLogin.ensureLoggedIn(), async(request, response) => {
  
  try{
    const eventId=request.query.eventId;
  console.log(eventId);
    const eventCont = await AllEvents.findOne({
      where: {id:eventId}
    });
      let flag=0;
      var enddate = new Date(eventCont.eventEndDate);
      if(enddate<new Date()){
        flag=1
      }
   if(request.user.email==="admin@gmail.com"){
    response.render("AdminView",{eventCont, eventId,flag})
   }
   else{
    response.render("viewEvent",{eventCont, eventId,flag})
   }
  }
  catch(err){
    console.log(err);
  }
});


// //
// app.get("/registerEvent",connectEnsureLogin.ensureLoggedIn(),async(request, response)=>{
//   const ev=request.query.eventId;
//   try{
//     await Registers.create({
//       userId:request.user.id,
//       eventId:ev

//     })
//     response.redirect("/myEvents");
//   }
//   catch(err){
//     console.log(err)
//   } 
// })

//register for a event(users)
app.get("/registerEvent",connectEnsureLogin.ensureLoggedIn(),async(request, response)=>{
  try{
    await trackEvents.create({
      userId:request.user.id,
      eventId:request.query.eventId

    })
    response.redirect("/myEvents");
  }
  catch(err){
    console.log(err)
  } 
})

//unregister for a event(users)
app.get("/unRegister",connectEnsureLogin.ensureLoggedIn(),async(request, response)=>{
  try{
    await trackEvents.destroy({
      where: {
        userId:request.user.id,
      eventId:request.query.eventId
      }

    })
    response.redirect("/myEvents");
  }
  catch(err){
    console.log(err)
  } 
})

//Delete a Event(Admin)
app.get("/deleteEvent", connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
  const eventId=request.query.eventId;
  console.log(eventId);
  try{
  await AllEvents.destroy({
    where:{
      id:eventId
    }
  })
  response.redirect('/AllEvents')
}
catch(err){
  console.log(err)
}
})


// app.get("/trackEvent", connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
//   try {
//     const eventId= request.query.eventId;
//     // const eventData = await AllEvents.findOne({id:eventId});
//     // const formattedEventData = eventData.map(eventData => ({
//     //   id: eventData.id,
//     //   eventImg: eventData.eventImg,
//     //   eventTitle: eventData.eventTitle,
//     //   eventDesc: eventData.eventDesc,
//     //   eventVenue: eventData.eventVenue,
//     //   eventCapacity: eventData.eventCapacity,
//     //   eventStartDate: eventData.eventStartDate,
//     //   eventTime: eventData.eventTime,
//     //   eventEndDate: eventData.eventEndDate,
//     //   createdAt: eventData.createdAt,
//     //   updatedAt: eventData.updatedAt,
//     // }));

//     const registerEventData = await trackEvents.findAll({eventId:eventId});
//     const formattedRegisterEventData = registerEventData.map(eventData => ({
//       id: eventData.id,
//       UserId: eventData.userId,  // Fix the typo here
//     }));
//     const UserData = await User.findAll();
//     const formattedUserData = UserData.map(eventData => ({
//       id: eventData.id,
//       firstName: eventData.firstName,
//     }));
    
//     response.render('trackEvents', {
//       title: 'Registration',
//       formattedEventData,
//       formattedRegisterEventData,
//       formattedUserData,
//       csrfToken: request.csrfToken(),
//     });
//   } catch (err) {
//     console.log(err);
//     response.status(500).send('Internal Server Error');
//   }
// });



//View users who register for the event
app.get("/trackEvent",connectEnsureLogin.ensureLoggedIn(),async(request, response)=>{
  try {
    const eventId = request.query.eventId;
    console.log("trackeventId "+eventId);
    const data = await trackEvents.findAll({
        attributes: ['id', 'userId', 'eventId'],
    });
    console.log("trackdata "+data);
    const temp=[];
    for(let i=0 ; i<data.length;i++){
        if(data[i].eventId==eventId){
          temp.push(data[i])
        }
    }
    console.log("trackTemp "+temp);
    const userIdArray = temp.map(entry => entry.userId);
    console.log("trackUserId "+userIdArray)
    const formattedData = [];
    for (let i = 0; i < userIdArray.length; i++) {
        const userDetails = await User.findOne({
            where: {
                id: userIdArray[i]
            }
        });
        formattedData.push(userDetails);
    }
    console.log("trackForData "+formattedData);
    response.render('trackEvents', { formattedData ,name:request.user.firstName});
} catch (error) {
    console.error("Error retrieving data:", error);
    response.status(500).send("Internal Server Error");
}
})


//Events of users registered
app.get("/myEvents", connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
      const currentUserId = request.user.id;
      const data = await trackEvents.findAll({
          attributes: ['id', 'userId', 'eventId'],
          where: {
              userId: currentUserId
          }
      });
      const eventIdArray = data.map(entry => entry.eventId);
      const formattedData = [];
      for (let i = 0; i < eventIdArray.length; i++) {
          const eventDetails = await AllEvents.findOne({
              where: {
                  id: eventIdArray[i]
              }
          });
          formattedData.push(eventDetails);
      }
      response.render('myEvents', { formattedData ,name:request.user.firstName});
  } catch (error) {
      console.error("Error retrieving data:", error);
      response.status(500).send("Internal Server Error");
  }
});


//Edit a event only Admin
app.get("/editEvent",connectEnsureLogin.ensureLoggedIn(),async(request, response)=>{
  const eventId=request.query.eventId;
  response.render("editEvent", {csrfToken: request.csrfToken(), eventId});
})


//submission of Event
app.post('/editEvent', isAuthenticated, async (request, response) => {
  try {
      const eventId = request.body.eventId; 
      console.log(eventId);
      const eventToUpdate = await AllEvents.findOne({
        where: {id:eventId}
      });
      eventToUpdate.eventImg = request.body.eventImg;
      eventToUpdate.eventTitle = request.body.eventTitle;
      eventToUpdate.eventDesc = request.body.content;
      eventToUpdate.eventVenue = request.body.eventLocation;
      eventToUpdate.eventCapacity = request.body.eventMembers;
      eventToUpdate.eventStartDate = request.body.eventStartDate;
      eventToUpdate.eventTime = request.body.eventTime;
      eventToUpdate.eventEndDate = request.body.eventEndDate;
      await eventToUpdate.save();
      response.redirect('/AllEvents');
  } catch (error) {
      console.error(error);
      response.status(500).send('Internal Server Error');
  }
});

module.exports=app;
