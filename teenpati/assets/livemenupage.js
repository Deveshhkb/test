$(document).ready(function () {
  var clickActQut = 0;
  var clickHstQut = 0;
  var isMuted = false;
  var interval = null;
  var spinballarr;
  var timeLeft = 0;
  var socialmediaLink;
  // var luckynum;

  // Prod Ips
  var API_URL = "http://68.183.245.141/";

  
  $("<div/>", {
    id: "totalcoinetxt1",
    class: "totalcurrSign1",
  }).appendTo("#coinamountfield_1");

  $(".blstxt").html("Balance:");

  //  congratulation gif div create
  $("<div/>", {
    id: "congtatulationgif",
    class: "congtatulationgif",
  }).appendTo("#winningResultShow");

  // coin gif div create
  $("<div/>", {
    id: "getcoingif",
    class: "getcoingif",
  }).appendTo("#coinamountfield");

  $("<div/>", {
    id: "coinamontwin",
    class: "coinamontwinstyle",
  }).appendTo("#wincoinbg");
});
