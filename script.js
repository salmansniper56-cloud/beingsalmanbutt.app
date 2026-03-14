function addProduct(){

let name=document.getElementById("name").value;
let price=document.getElementById("price").value;

let list=document.getElementById("productList");

let li=document.createElement("li");

li.innerHTML=name+" - "+price+" PKR";

list.appendChild(li);

}
