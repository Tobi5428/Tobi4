import React, { useEffect } from "react";
function Customercare() {

 useEffect(() => { 
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();

const s1 = document.createElement("script");
const s0 = document.getElementsByTagName("script")[0];


s1.async=true;
s1.src='https://embed.tawk.to/6a05fe41f7c7ab1c39ff2fdb/';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');

s0.parentNode.insertBefore(s1,s0);

window.Tawk_API = Tawk_API
 }, []);

 return ( 
  <div>
    <h1>JEGA Bank</h1>
   </div>
 );
}

export default Customercare;