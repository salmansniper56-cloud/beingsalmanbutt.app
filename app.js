import { auth, db } from "./firebase.js";

import {
createUserWithEmailAndPassword,
signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
collection,
addDoc,
getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const registerBtn=document.getElementById("registerBtn");

if(registerBtn){
registerBtn.onclick=async()=>{

let email=document.getElementById("email").value;
let password=document.getElementById("password").value;

await createUserWithEmailAndPassword(auth,email,password);

alert("Account created");

};
}


const loginBtn=document.getElementById("loginBtn");

if(loginBtn){
loginBtn.onclick=async()=>{

let email=document.getElementById("email").value;
let password=document.getElementById("password").value;

await signInWithEmailAndPassword(auth,email,password);

window.location="dashboard.html";

};
}


const addBtn=document.getElementById("addProduct");

if(addBtn){
addBtn.onclick=async()=>{

let name=document.getElementById("product").value;
let price=document.getElementById("price").value;

await addDoc(collection(db,"products"),{
name:name,
price:price
});

alert("Product added");

};
}
