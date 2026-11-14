export const txns=[
 {name:"Swiggy",cat:"Food",date:"Today, 1:20 PM",amount:-450,icon:"🍜"},{name:"Uber",cat:"Transport",date:"Today, 9:05 AM",amount:-320,icon:"🚕"},{name:"Freelance Project",cat:"Income",date:"Sep 27",amount:8500,icon:"💼"},{name:"Spotify",cat:"Entertainment",date:"Sep 26",amount:-119,icon:"🎵"},{name:"Grocery Store",cat:"Food",date:"Sep 25",amount:-1240,icon:"🛒"},
];
export const categories=[{name:"Food",amount:6250,pct:34},{name:"Transport",amount:3680,pct:20},{name:"Shopping",amount:3210,pct:17},{name:"Entertainment",amount:2480,pct:13},{name:"Other",amount:2800,pct:16}];
export const money=(n:number)=>`${n<0?"-":""}₹${Math.abs(n).toLocaleString("en-IN")}`;
