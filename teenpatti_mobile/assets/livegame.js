const coinschange = (str) => {
  if (["string", "number"].includes(typeof str)) {
    return str
      ?.toString()
      ?.split("")
      .reverse()
      .join("")
      .replace("0000000", "CR")
      .replace("000000", "M")
      .replace("00000", "L")
      .replace("000", "K")
      ?.split("")
      .reverse()
      .join("");
  }
  return str;
};

/*-- Document Ready Starts --*/
$(document).ready(function () {
  userCreatorDiv();
  // All services are served by the local backend (backend/src/server.js)
  var BACKEND = window.location.origin + "/";
  var API_URL = BACKEND;
  let Bet_URL = BACKEND + "VirtualCasinoBetPlacer/vc/";
  var API_Img = BACKEND;
  let API_Admin = BACKEND + "admin-new-apis/enduser/";
  let API_Edup = BACKEND;
  let API_TOKEN = new URLSearchParams(window.location.search).get("id");
  let User_name = new URLSearchParams(window.location.search).get("username");

  // not logged in -> go get a token first, then come back here
  if (!API_TOKEN) {
    window.location.replace(
      "/login.html?next=" + encodeURIComponent(window.location.pathname)
    );
    return;
  }

  let isbet = false;
  var isMuted = false;
  var mid = "";
  var winnermid = "";
  var hidden = true;
  var resultShown = false;
  var actionList = [];
  var timerInterval;
  var gameRoundid;
  let betplaceanimation;
  let betplaceanimation2;
  var amount = "";
  var currentCoin = 0;
  var betcoins = 0;
  let totalCoins = 0; //
  var clickqut = 0;
  var qutdisplay = 0;
  var timeLeftGame;

  let clkqut = 0;
  let confirmBet;
  let t2 = [];
  let exp = 0;
  let isFirstTime = false;
  let playerAret = "";
  let playerBret = "";
  let chipAmount = [];
  let defaultValue = 0;
  const time_period = 45;
  let gameStatust2;
  let stopbetQut = false;
  let firsttimeConnect = false;
  const progress_bar_inner = document.querySelector(".progress_bar_inner");

  function libalityData() {
    axios
      .post(
        `${Bet_URL}liability`,
        {
          roundId: mid,
        },
        { headers: { Authorization: `Bearer ${API_TOKEN}` } }
      )
      .then((res) => {
        const libData = res.data.data;
        console.log(
          libData,
          libData[0].liability,
          "first",
          libData[2].liability,
          "second"
        );
        firstVal = libData[0].liability;
        secondVal = libData[2].liability;

        if (firstVal < 0 || secondVal < 0) {
          $("#libinnerdata_1").css("color", "red");
          $("#libinnerdata_2").css("color", "red");
        } else if (firstVal > 0 || secondVal > 0) {
          $("#libinnerdata_1").css("color", "green");
          $("#libinnerdata_2").css("color", "green");
        }
        if (firstVal < 0 || secondVal < 0 || firstVal > 0 || secondVal > 0) {
          $("#libinnerdata_1").html(firstVal.toFixed(2));
          $("#libinnerdata_2").html(secondVal.toFixed(2));
        } else if (firstVal == "0" || secondVal == "0") {
          $("#libinnerdata_1").html("");
          $("#libinnerdata_2").html("");
        }
      });
  }
  $("#betAmountData").on("input", function () {
    var inputValue = $(this).val();
    var numericValue = inputValue.replace(/[^0-9]/g, "");
    $(this).val(numericValue);
  });
  /*     Game Function Section    */
  firsttimeConnect = true;

  axios.post(
    `${Bet_URL}casino-game-list`,
    { gameType: "virtual" },
    { headers: { Authorization: `Bearer ${API_TOKEN}` } }
  );
  var betdata = [];
  let userIpVlu = "";

  const betPlaceApiCall = (token, data, handleSuccess) => {
    axios
      .post(`${Bet_URL}place-bet`, data, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        res?.data?.status && handleSuccess();
        libalityData();
        if (res.data.status === false) {
          Toastify({
            text: res?.data.message,
            style: { background: "red" },
          }).showToast();
        }
      })
      .catch((err) =>
        Toastify({
          text: err.response.data.message,
          style: { background: "red" },
        }).showToast()
      );
  };

  fetch(API_Edup + "betfair_api/my-ip")
    .then((res) => res.json())
    .then((res) => {
      userIpVlu = res.ip;
    });

  getUserBalance();
  function getUserBalance() {
    axios
      .post(
        `${API_Admin}get-user-balance`,
        {},
        { headers: { Authorization: `Bearer ${API_TOKEN}` } }
      )
      .then((res) => {
        totalCoins = res.data.data.balance;
        exp = res.data.data.libality;
        // console.log(res);
        $("#totalcoinetxt").html(totalCoins);
        $("#expBlsTxt").html(exp);
        $("#usernameid").html(`${User_name}`);
      });
  }

  setInterval(() => {
    getUserBalance();
    getMyBetData();
  }, 1000);

  function getMyBetData() {
    axios
      .post(
        `${API_Admin}bet-list-by-matchid`,
        { matchId: "15" },
        { headers: { Authorization: `Bearer ${API_TOKEN}` } }
      )
      .then((res) => {
        $("#mybetdetalis").empty();
        const mybetdata = res.data.data.VT20;
        let mybetCnt = mybetdata.length;
        $("#mybetnumber").html(mybetCnt);
        mybetdata.forEach((item, i) => {
          $("<div/>", {
            id: "historyuserhis_child" + i,
            class: "historyuserhis_child_style",
          }).appendTo("#mybetdetalis");
          $("<div/>", {
            id: "history_first_div" + i,
            class: "history_first_div",
          }).appendTo("#historyuserhis_child" + i);

          $("<div/>", {
            id: "history_player" + i,
            class: "history_playerType _box",
            html: item.nation,
          }).appendTo("#history_first_div" + i);
          $("<div/>", {
            id: "history_odd" + i,
            class: "history_odd _box",
            html: item.rate,
          }).appendTo("#history_first_div" + i);
          $("<div/>", {
            id: "history_amt" + i,
            class: "history_amount _box",
            html: item.amount,
          }).appendTo("#history_first_div" + i);
        });
      });
  }

  axios
    .post(
      `${API_Admin}bet-list-by-matchid`,
      { matchId: "504" },
      { headers: { Authorization: `Bearer ${API_TOKEN}` } }
    )
    .then((res) => {
      // console.log("res", res);
      totalCoins = res.data.data.balance;
      $("#totalcoinetxt").html(totalCoins);
    });

  $("#resultprt").hide();
  $("#timeclsprn").empty();
  $("#timercount").empty();
  $("#timercount").hide();
  $(".stclss").hide();
  $(".secstyle").hide();

  function betcoin() {
    axios
      .post(
        `${API_Admin}get-stake-button`,
        {},
        { headers: { Authorization: `Bearer ${API_TOKEN}` } }
      )
      .then((res) => {
        const data = res.data.data;
        // console.log(data);

        let index = 1;
        for (let key in data) {
          if (index <= 6) {
            $("#chiptxt_" + index).html(coinschange(`${data[key]}`));
            $("#chip_" + index).attr("value", `${data[key]}`);

            index++;
            chipAmount.push(data[key]);
          }
        }
      });
  }
  betcoin();

  try {
    function getLast10GameResult(timeout = 0) {
      axios.get(API_URL + "CasinoAdmin/GetData/t20Result").then((res) => {
        const lastGames = res.data;
        winnermid = lastGames[0].mid;
        if (winnermid === mid && !resultShown) {
          resultShown = true;

          setTimeout(function () {
            totalCoins = 0;
            qutdisplay = 0;
            clickqut = 0;
            betcoins = 0;
            betdata = [];
            $(".libinnerdata").html("");
            $("#betcoinetxt").html(betcoins);
          }, 2600);

          // console.log(lastGames[0].winner, "result0winner");
          $(".removepchbg").empty();
          if (lastGames[0].winner == "1") {
            setTimeout(function () {
              $("#firstuserwin").addClass("winnerimg");
            }, 2500);
          } else if (lastGames[0].winner == "2") {
            setTimeout(function () {
              $("#seconduserwin").addClass("winnerimg");
            }, 2500);
          }
        }
        setTimeout(
          () =>
            lastGames.forEach(function (data, i) {
              let winningresult;
              winningresult = data.winner;
              let resultDataMid = data.mid;
              $("#numerbox_" + (i + 1)).empty();
              $("<div/>", {
                id: "hisTextStyle_" + (i + 1),
                class: "hisTextStyle",
              }).appendTo("#numerbox_" + (i + 1));

              if (data.winner === "1") {
                $("#hisTextStyle_" + (i + 1)).html("A");
                $("#hisTextStyle_" + (i + 1)).addClass("resultBgBlue");
              } else if (data.winner === "2") {
                $("#hisTextStyle_" + (i + 1)).html("B");
                $("#hisTextStyle_" + (i + 1)).addClass("resultBgPink");
              } else if (data.winner === "3") {
                $("#hisTextStyle_" + (i + 1)).html("T");
                $("#hisTextStyle_" + (i + 1)).addClass("resultBggreen");
              }
              $("#hisTextStyle_" + (i + 1)).bind("click", function () {
                const url =
                  API_URL + "CasinoAdmin/GameResultById?mid=" + resultDataMid;
                popupurl(url);
                $("#resultPopup").show();
                $("#outerresultborder").show();
              });
            }),
          timeout
        );
      });
    }
  } catch (error) {}

  function popupurl(urllink) {
    try {
      axios.get(urllink).then((res) => {
        const data = res.data;
        let gRId = data.mid;
        $("#gameRId").html(`Game Round ID : ${gRId}`);
        if (data.winner == "1") {
          // $(".playerA_txtStyle").css("background-color" = "green");
          $("#playerA_txt").addClass("changecolorResultBg");
          $("#playerB_txt").removeClass("changecolorResultBg");
          $("#resultFirstshow").addClass("winnerimg");
        } else if (data.winner == "2") {
          $("#resultSecondshow").addClass("winnerimg");
          $("#playerB_txt").addClass("changecolorResultBg");
          $("#playerA_txt").removeClass("changecolorResultBg");
        }
        for (let i = 1; i < 7; i++) {
          const cardimg = data[`C${i}`];
          $("#resultimg" + i).append(
            $("<img>", {
              src: API_Img + `images/cards/${cardimg}.png`,
            })
          );
        }
      });
    } catch (error) {}
  }

  $(".resultclosepop").bind("click", function () {
    $("#resultPopup").hide();
    $("#outerresultborder").hide();
    $(".resultStyle").empty();
    $("#resultFirstshow").removeClass("winnerimg");
    $("#resultSecondshow").removeClass("winnerimg");
  });

  $("#resultPopup").click(function (event) {
    if (
      $(event.target).closest("#resultPopupText").length ||
      $(event.target).is(".resultclosepop")
    ) {
      return;
    }
    $("#resultPopup").hide();
    $(".resultStyle").empty();
    $("#resultFirstshow").removeClass("winnerimg");
    $("#resultSecondshow").removeClass("winnerimg");
  });

  getLast10GameResult();
  let autoTime = 0;
  async function getgameDatat1() {
    let apires;
    try {
      apires = await axios.get(API_URL + "CasinoAdmin/GetData/t20Data");
      const t1 = apires.data.data.t1;
      t2 = apires.data.data.t2;
      playerAret = t2[0].rate;
      playerBret = t2[0].rate;
      $("#firstPlayerOds").html(`${playerAret}`);
      $("#secondPlayerOds").html(`${playerBret}`);

      mid = apires.data.data.t1[0]?.mid;
      let gameidvalue = mid;
      $("#roundidtxt").html(`Game Round Id : - ${gameidvalue}`);
      $("#mindatatxt").html(t2[0]?.min);
      $("#maxdatatxt").html(`${t2[0]?.max} )`);

      if (mid !== winnermid) {
        resultShown = false;
      }
      let firstmid;
      let secondmid;

      t2.forEach(function (data) {
        gameStatust2 = data.gstatus;
        secondmid = data.mid;
      });
      t1.forEach(function (data, i) {
        firstmid = data.mid;
        timeLeftGame = data.autotime;
        totalCoins = data.max;
        autoTime = timeLeftGame;
        let progress_bar_left = (timeLeftGame / time_period) * 100;
        progress_bar_inner.style.width = `${100 - progress_bar_left}%`;
        if (timeLeftGame?.toString().length < 2)
          timeLeftGame = "0" + timeLeftGame;
        $("#timercount").html(`${timeLeftGame ? timeLeftGame.toString() : 0} `);

        for (let i = 1; i < 7; i++) {
          if (data[`C${i}`] != "") {
            let cardimg = data[`C${i}`];

            $("#selectdata_" + i).addClass("showcard");
            if ($("#card-back_" + i)[0].children.length == 0) {
              cardflip();
              $("#card-back_" + i).append(
                $("<img>", {
                  src: API_Img + `images/cards/${cardimg}.png`,
                })
              );
            }
          }
        }

        if (gameStatust2 == 1 && timeLeftGame == 45) {
          // $("#waitfornext").removeClass("bettingwait");
          $("#gamestart").addClass("betStart");
          $("#stopbettxt").removeClass("stopbetanm");
          openbetsound();

          stopbetQut = true;
          hidden = true;
          firsttimeConnect = false;
          function animationCallBack() {
            let m = Math.ceil(Math.random() * 30);
            clearInterval(betplaceanimation);
            firstUserbetanim();
            betplaceanimation = setInterval(animationCallBack, m * 100);
          }

          function animationCallBack2() {
            let m2 = Math.ceil(Math.random() * 30);
            clearInterval(betplaceanimation2);
            secondUserbetanim();
            betplaceanimation2 = setInterval(animationCallBack2, m2 * 100);
          }

          let m = Math.ceil(Math.random() * 30);
          let m2 = Math.ceil(Math.random() * 30);

          betplaceanimation = setInterval(animationCallBack, m * 100);
          betplaceanimation2 = setInterval(animationCallBack2, m2 * 100);

          $(".card-back").empty();
          $(".card-inner").removeClass("showcard");
          gameStartFunction(timeLeftGame);
          $("body")
            .get(0)
            .style.setProperty("--timerDuration", timeLeftGame + "s");
        } else if (!isFirstTime) {
          isFirstTime = true;
          $(".libinnerdata").html("");
          $("#gamestart").removeClass("betStart");
          $("#stopbettxt").removeClass("stopbetanm");
        }
        if (gameStatust2 == 1 && timeLeftGame <= 45) {
          $("#firstuserwin").empty();
          $("#firstuserwin").removeClass("winnerimg");
          $("#seconduserwin").empty();
          $("#seconduserwin").removeClass("winnerimg");
          stopbetQut = true;
          hidden = true;
          gameStartFunction(timeLeftGame);
        }
        if (gameStatust2 == 0 && timeLeftGame == 0 && hidden) {
          $(".settingprnt").hide();
          $("#gamestart").removeClass("betStart");
          if (stopbetQut && hidden) {
            stopbetQut = false;
            $("#stopbettxt").addClass("stopbetanm");
            closebetsound();
          }
          hidden = false;
          clearInterval(betplaceanimation);
          clearInterval(betplaceanimation2);

          setTimeout(function () {
            $("#resultprt").show();
          }, 2500);
          timerclose();
          clearInterval(betplaceanimation);
          clearInterval(betplaceanimation2);
        }
        if (gameStatust2 == 0) {
          $(".settingprnt").hide();
          $("#numberlock").addClass("numberlock");
        }
        if (gameStatust2 == 1 && timeLeftGame <= 45 && firsttimeConnect) {
          function animationCallBack() {
            let m = Math.ceil(Math.random() * 30);
            clearInterval(betplaceanimation);
            firstUserbetanim();
            betplaceanimation = setInterval(animationCallBack, m * 100);
          }

          function animationCallBack2() {
            let m2 = Math.ceil(Math.random() * 30);
            clearInterval(betplaceanimation2);
            secondUserbetanim();
            betplaceanimation2 = setInterval(animationCallBack2, m2 * 100);
          }

          let m = Math.ceil(Math.random() * 30);
          let m2 = Math.ceil(Math.random() * 30);

          betplaceanimation = setInterval(animationCallBack, m * 100);
          betplaceanimation2 = setInterval(animationCallBack2, m2 * 100);

          firsttimeConnect = false;
        }
        getLast10GameResult(5000);
      });
    } catch (error) {}
  }
  setInterval(async () => {
    await getgameDatat1();
  }, 1000);

  function timerclose() {
    qutdisplay++;
    $("#timeclsprn").empty();
    $("#timercount").empty();
    $("#timercount").hide();
    $(".progress_bar_inner").hide();
    progress_bar_inner.style.width = `${timeLeftGame}%`;
    $(".stclss").hide();
    $(".secstyle").hide();
    $(".inner").remove();
    $("#bettinStr").addClass("bettingStopimg");
    $("#bettingText").show();
    $("#bettingText").addClass("bettingStopTxt");
    setTimeout(function () {
      $("#bettingText").removeClass("bettingStopTxt");
    }, 2500);
  }

  function gameStartFunction(timeLeftGame) {
    var time_left_ms = 0;
    $("#timeclsprn").show();

    if (timeLeftGame > 0) {
      $("#resultprt").hide();
      $("#clockimg").show();
      $(".clockcolor").show();
      $("#timercount").show();
      $(".stclss").show();
      $(".secstyle").show();
      $(".progress_bar_inner").show();
      var time_left = timeLeftGame;

      function createProgressbar(id, duration, callback) {
        var progressbar = document.getElementById(id);
        progressbar.className = "progressbar";
        const childNotes = progressbar.childNodes;

        if (childNotes.length > 1 && !!childNotes[1]) {
          return;
        } else {
          var progressbarinner = document.createElement("div");
          progressbarinner.className = "inner";
          progressbarinner.style.animationDuration = duration;
          if (typeof callback === "function") {
            progressbarinner.addEventListener("animationend", callback);
          }
          progressbar.appendChild(progressbarinner);
          progressbarinner.style.animationPlayState = "running";
        }
      }
      createProgressbar("progressbar1", time_left);
    }

    $("#numberlock").removeClass("numberlock");

    // openbsetsound();
    // playbgm();
  }
  // betting table to place bet animation start

  function firstUserbetanim() {
    if (gameStatust2 == 1) {
      $("#firstuserprofile").addClass("firstusershake");
      setTimeout(function () {
        $("#firstuserprofile").removeClass("firstusershake");
      }, 90);
      let t = Math.ceil(Math.random() * 2);

      betChipFunctionHelper("#table_" + t);

      if (t == "1") {
        $("#" + clickqut + "chip-id").addClass("betChipAnimFirstDummy");
        coinsSound();
      } else if (t == "2") {
        $("#" + clickqut + "chip-id").addClass("betChipAnimFirstDummy2");
        coinsSound();
      }
      $("#table_" + t).addClass("permanetchangebackground removepchbg");
    }
  }

  function secondUserbetanim() {
    if (gameStatust2 == 1) {
      $("#seconduserprofile").addClass("secondUserShake");
      setTimeout(function () {
        $("#seconduserprofile").removeClass("secondUserShake");
      }, 90);

      let b = Math.ceil(Math.random() * 2);

      betChipFunctionHelper("#table_" + b);
      // console.log(b, "random data");
      if (b == "1") {
        $("#" + clickqut + "chip-id").addClass("betChipAnimSecondDummy");
        coinsSound();
      } else if (b == "2") {
        $("#" + clickqut + "chip-id").addClass("betChipAnimSecondDummy2");
        coinsSound();
      }
      $("#table_" + b).addClass("permanetchangebackground removepchbg");
    }
  }

  function betChipFunctionHelper(tableNo) {
    clickqut++;
    let m = Math.ceil(Math.random() * 6);
    $("<div/>", {
      id: clickqut + "chip-id",
      class: "betchipimgbgposition",
      style: `background-image: url(../assets/images/${m}_chip.png); top:${
        Math.random() * 100 + "%"
      } ; left:${Math.random() * 100 + "%"}`,
    }).appendTo(tableNo);
  }

  // bet user function start

  // bet user function end
  function currentUserBetChipHelper(tablename) {
    clickqut++;
    $("<div/>", {
      id: clickqut + "chip-id",
      class: "betchipimgbgposition",
      style: `background-image: url(../assets/images/${
        chipAmount.indexOf(+amount) + 1
      }_chip.png); top:${Math.random() * 100 + "%"} ; left:${
        Math.random() * 100 + "%"
      }`,
    }).appendTo(tablename);
  }

  $("#firstPlayerOds").bind("click", function () {
    confirmBet = 1;
    isbet = true;
    $(".settingprnt").show();
    $("#betAmountData").val(`${defaultValue}`);
  });

  $("#secondPlayerOds").bind("click", function () {
    confirmBet = 2;
    isbet = true;
    $(".settingprnt").show();
    $("#betAmountData").val(`${defaultValue}`);
  });
  $(".settingprnt").click(function (event) {
    if (
      $(event.target).closest("#settingpage").length ||
      $(event.target).is("#settingcls")
    ) {
      return;
    }
    $(".settingprnt").hide();
    $("#betAmountData").val(`${defaultValue}`);
  });

  $("#settingcls").bind("click", function () {
    $(".settingprnt").hide();
    $("#betAmountData").val(`${defaultValue}`);
  });

  $("#betplacebtn").bind("click", function () {
    if ((confirmBet === 1 || confirmBet === 2) && isbet) {
      $(".settingprnt").hide();
      amount = $("#betAmountData")[0].value;
      coinsSound();
      betPlaceApiCall(
        API_TOKEN,
        {
          casinoName: 1,
          isBack: true,
          odds:
            confirmBet === 1
              ? t2.find((item) => item.nat === "Player A")?.rate
              : t2.find((i) => i.nat === "Player B")?.rate,
          stake: amount,
          selectionId:
            confirmBet === 1
              ? t2.find((item) => item.nat === "Player A")?.sid
              : t2.find((i) => i.nat === "Player B")?.sid,
          placeTime: moment().format("DD-MM-YYYY hh:mm:sss"),
          marketId: mid,
          matchId: 15,
          userIp: userIpVlu,
          deviceInfo: {
            userAgent: navigator.userAgent,
            browser: "Chrome",
            device: "Macintosh",
            deviceType: "desktop",
            os: "Windows",
            os_version: "windows-10",
            browser_version: "108.0.0.0",
            orientation: "landscape",
          },
        },

        () => {
          Toastify({
            text: "Bet Placed",
            style: { background: "green" },
          }).showToast();
          if (confirmBet == 1) {
            // console.log("trueeee1");

            currentUserBetChipHelper("#table_1");
            $("#" + clickqut + "chip-id").addClass("betChipsMainUser");
            const obj = {
              // option: "Single:0",
              amount,
            };
            betdata.push(obj);
            actionList.push({ ...obj, type: "Bet Place" });
            betcoins = Number(betcoins) + Number(amount);

            $("#betcoinetxt").html(betcoins);

            $("#table_1").addClass("permanetchangebackground removepchbg");
            confirmBet = 3;

            // console.log("trueeee11");
          }
          if (confirmBet == 2) {
            // console.log("trueeee2");

            currentUserBetChipHelper("#table_2");
            $("#" + clickqut + "chip-id").addClass("betChipsMainUser2");

            betcoins = Number(betcoins) + Number(amount);

            $("#betcoinetxt").html(betcoins);

            $("#table_2").addClass("permanetchangebackground removepchbg");
            // betcoinsound();
            // console.log("trueeee22");
            confirmBet = 3;
          }
        }
        // () => console.log("called")
      );
      isbet = false;
    }
  });

  function amountAPI() {
    if (!(Number(totalCoins) >= Number(betcoins))) {
      clickqut = 0;
      betcoins = 0;
      betdata = [];
      $("#betcoinetxt").html(betcoins);
      $(".removeChipcls").remove();
      $(".removepchbg").removeClass("permanetchangebackground");
    }
    $("#neterrorprnt").hide();
  }

  amountAPI();

  $("<div/>", {
    id: "betcoinetxt",
    class: "currSign",
    html: betcoins,
  }).appendTo("#betamountfield");

  $("<div/>", {
    id: "totalcoinetxt",
    class: "totalcurrSign",
    html: totalCoins,
  }).appendTo("#coinamountfield");

  $(".chipValue").bind("click", function () {
    let clickCoin = $(this).attr("value");
    currentCoin = clickCoin;
    amount = clickCoin;
    defaultValue = clickCoin;
    $("#betAmountData").val(`${currentCoin}`);
  });

  $(".valueStyleDec").bind("click", function () {
    let inputVal = $("#betAmountData").val();
    let crntValue = Number(inputVal);
    crntValue--;
    $("#betAmountData").val(`${crntValue}`);
    if (crntValue < 0) {
      $("#betAmountData").val("0");
    }
  });
  $(".valueStyleInc").bind("click", function () {
    inputVal = $("#betAmountData").val();
    crntValue = Number(inputVal);
    crntValue++;
    $("#betAmountData").val(`${crntValue}`);
  });

  $("<div/>", {
    id: "waitingImageTxt",
  }).appendTo(".waitingImage");

  // wallet_balance

  $(".chipValue").bind("click", function (e) {
    e.preventDefault();
    $("div.active").not(this).removeClass("active");
    $(this).addClass("active");
  });

  numberboxstyle();
  // $("#numberlock").addClass("numberlock");

  function numberboxstyle() {
    for (i = 1; i < 11; i++) {
      $("<div/>", {
        id: "numerbox_" + i,
        class: "numberbox",
      }).appendTo("#numberhistory");
    }

    $("<div/>", {
      id: "audio_icon",
      class: "audio_icon",
    }).appendTo("#menuicon");

    $("<div/>", {
      id: "numberlock",
    }).appendTo("#gamebody_container");

    // $("<div/>", {
    //   id: "rule_icon",
    //   class: "rule_icon",
    // }).appendTo("#menuicon");

    // $("#text_0").css("backgroundColor", "green");
  }

  // betting chip function end

  // let checkblsAmout = ( totalCoins,betcoins,) => {

  // }
  $("#mybetsection").bind("click", function () {
    $("#betPopup").show();
    $("#outerbetpopup").show();
    getMyBetData();
  });
  $("#outerbetpopup").bind("click", function () {
    $("#betPopup").css("display", "none");
    $("#mybetdetalis").empty();
  });
  $(".betclosepop").bind("click", function () {
    $("#betPopup").hide();
    $("#outerbetpopup").hide();
    $("#mybetdetalis").empty();
  });

  $("#rule_icon").bind("click", function () {
    $("#rulePopup").show();
    $("#outerborderpopup").show();
  });

  $("#outerborderpopup").bind("click", function () {
    $("#rulePopup").css("display", "none");
  });
  $(".closepop").bind("click", function () {
    $("#rulePopup").hide();
    $("#outerborderpopup").hide();
  });

  function alerMessagemoney(message = "Not Enough Balance") {
    $(".messageEnoughBox").addClass("resultShowimg");
    $(".messageEnoughBox").show();

    setTimeout(function () {
      $(".messageEnoughBox").removeClass("resultShowimg");
      $(".messageEnoughBox").hide();
    }, 2500);
  }

  function checkblsAmout() {
    return Number(totalCoins) >= Number(betcoins) + Number(amount);
  }
  function dblcheckblsAmout() {
    return Number(totalCoins) >= Number(betcoins) * 2;
  }

  function removebg() {}

  function closebetsound() {
    var audio = $("<audio>");
    audio.attr("src", "/assets/audio/stopbetting.mp3");
    audio.on("ended", removebg);
    if (!isMuted) {
      audio[0].play();
    }
  }
  function openbetsound() {
    var audio = $("<audio>");
    audio.attr("src", "/assets/audio/startbetting.mp3");
    audio.on("ended", removebg);
    if (!isMuted) {
      audio[0].play();
    }
  }

  function coinsSound() {
    var audio = $("<audio>");
    audio.attr("src", "/assets/audio/coinsound.wav");
    audio.on("ended", removebg);
    if (!isMuted) {
      audio[0].play();
    }
  }
  function cardflip() {
    var audio = $("<audio>");
    audio.attr("src", "/assets/audio/flipcard.mp3");
    audio.on("ended", removebg);
    if (!isMuted) {
      audio[0].play();
    }
  }
  function wincupsound() {
    var audio = $("<audio>");
    audio.attr("src", "/assets/audio/winsong.mp3");
    audio.on("ended", removebg);
    if (!isMuted) {
      audio[0].play();
    }
  }

  $("#audio_icon").bind("click", function () {
    isMuted = !isMuted;
    if (isMuted) {
      $("#audio_icon").removeClass("audio_icon");
      $("#audio_icon").addClass("muteaud_icon");
      pausebgm();
    } else {
      $("#audio_icon").addClass("audio_icon");
      $("#audio_icon").removeClass("muteaud_icon");
      playbgm();
    }
  });

  function playbgm() {
    objPlayPauseMusic.play();
    objPlayPauseMusic.volume = 0.5;
  }

  function pausebgm() {
    objPlayPauseMusic.pause();
  }

  $("#play_audio").bind("click", playbgm);
  $("#pause_audio").bind("click", pausebgm);
  var objPlayPauseMusic = document.createElement("audio");
  objPlayPauseMusic.src = "/assets/audio/bgm.mp3";
  objPlayPauseMusic.addEventListener("ended", playbgm);

  const elem = document.querySelectorAll(".moneyUpdateTxt");

  elem.forEach((el) => {
    el.addEventListener("mouseenter", function (event) {
      const target = event.currentTarget.id;
      const optionName = idOptionMapping[target];
      const amount = betdata
        .filter((item) => {
          return item.option == optionName;
        })
        .reduce((a, b) => {
          return Number(a) + Number(b.amount);
        }, 0);
      // console.log(amount);
      if (amount) {
        el.setAttribute("title", amount + " chips");
      }
    });
  });
});
