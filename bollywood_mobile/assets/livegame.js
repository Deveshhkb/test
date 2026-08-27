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
  let isFirstTime = false;
  var isMuted = false;
  var mid = "";
  var winnermid = "";
  var hidden = true;
  var resultShown = false;
  var actionList = [];
  var timerInterval;
  var gameRoundid;
  var amount = 1000;
  var currentCoin = 10;
  var betcoins = 0;
  let totalCoins = 0; //
  var clickqut = 0;
  var qutdisplay = 0;
  var timeLeftGame;
  let betplaceanimation;
  let betplaceanimation2;
  let clkqut = 0;
  let confirmBet;
  var betdata = [];
  var liveOddsDataObj = {};
  let chipAmount = [];
  isBackAct = true;
  let rateValue = 0;
  let gameRate;

  const time_period = 45;
  const progress_bar_inner = document.querySelector(".progress_bar_inner");
  let defaultValue = 0;

  let firsttimeConnect = false;
  let stopbetQut = false;
  let gameStatust2;

  $("#resultprt").hide();
  $("#timeclsprn").empty();
  $("#timercount").empty();
  $("#timercount").hide();
  $(".stclss").hide();
  $(".secstyle").hide();

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
        for (i = 1; i < 16; i++) {
          let sidLocal = liveOddsDataObj[i]?.sid;
          if (sidLocal === undefined) continue;
          let libLocal = libData.find((i) => i.sid == sidLocal)?.liability;
          if (libLocal === undefined) continue;
          if (libLocal < 0) {
            $("#libinnerdata_" + i).css("color", "red");
          } else if (libLocal > 0) {
            $("#libinnerdata_" + i).css("color", "green");
          }
          if (libLocal < 0 || 0 < libLocal) {
            $("#libinnerdata_" + i).html(libLocal.toFixed(2));
          } else if (libLocal == 0) {
            $("#libinnerdata_" + i).html(libLocal.toFixed(2));
            $("#libinnerdata_" + i).css("color", "green");
          }
        }
      });
  }

  $("#betAmountData").on("input", function () {
    var inputValue = $(this).val();
    var numericValue = inputValue.replace(/[^0-9]/g, "");
    $(this).val(numericValue);
  });
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
        { matchId: "13" },
        { headers: { Authorization: `Bearer ${API_TOKEN}` } }
      )
      .then((res) => {
        const mybetdata = res.data.data["VBollywood Casino"];
        $("#mybetdetalis").empty();
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
      totalCoins = res.data.data.balance;
      $("#totalcoinetxt").html(totalCoins);
    });

  // try {
  function betcoin() {
    axios
      .post(
        `${API_Admin}get-stake-button`,
        {},
        { headers: { Authorization: `Bearer ${API_TOKEN}` } }
      )
      .then((res) => {
        const data = res.data.data;

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
  // } catch {}
  betcoin();

  try {
    function getLast10GameResult(timeout = 0) {
      axios.get(API_URL + "CasinoAdmin/GetData/bwdtblResult").then((res) => {
        const lastGames = res.data;
        winnermid = lastGames[0].mid;
        if (winnermid === mid && !resultShown) {
          resultShown = true;
          setTimeout(() => {
            totalCoins = 0;
            qutdisplay = 0;
            clickqut = 0;
            betcoins = 0;
            betdata = [];
            $("#betcoinetxt").html(betcoins);
            $(".libinnerdata").html("");
            $(".libinnerdatam").html("");
            $(".libinnerdatab").html("");
          }, 1500);
          $(".removepchbg").empty();
          $(".removeChipcls").remove();
          $(".removepchbg").removeClass("permanetchangebackground");

          // current data result -->
          let currentresDetail = lastGames[0].detail.split(" || ");

          currentresDetail.forEach(function (item, i) {
            $("#dtlcard_" + (i + 1)).html(item);
          });

          const gameresult = lastGames[0].winner;
          if (gameresult == "1") {
            $("#currentResultName").html("DON");
          } else if (gameresult == "2") {
            $("#currentResultName").html("AMAR AKHBAR ANTHONY");
          } else if (gameresult == "3") {
            $("#currentResultName").html("SAHIB BIWI AUR GULAM");
          } else if (gameresult == "4") {
            $("#currentResultName").html("DHARAM VEER");
          } else if (gameresult == "5") {
            $("#currentResultName").html("KIS KIS KO PYAR KAROON");
          } else if (gameresult == "6") {
            $("#currentResultName").html("GHULAM");
          }

          if (lastGames[0].winner == "1") {
            $("#firstuserwin").addClass("winnerimg");
          } else if (lastGames[0].winner == "2") {
            $("#seconduserwin").addClass("winnerimg");
          }
        }
        setTimeout(
          () =>
            lastGames.forEach(function (data, i) {
              let winningresult = data.winner;
              let resultDataMid = data.mid;
              $("#numerbox_" + (i + 1)).empty();
              $("<div/>", {
                id: "hisTextStyle_" + (i + 1),
                class: "hisTextStyle",
              }).appendTo("#numerbox_" + (i + 1));
              if (winningresult === "1") {
                $("#hisTextStyle_" + (i + 1)).html("A");
                $("#hisTextStyle_" + (i + 1)).addClass("resultBgBlue");
              } else if (winningresult === "2") {
                $("#hisTextStyle_" + (i + 1)).html("B");
                $("#hisTextStyle_" + (i + 1)).addClass("resultBgPink");
              } else if (winningresult === "3") {
                $("#hisTextStyle_" + (i + 1)).html("C");
                $("#hisTextStyle_" + (i + 1)).addClass("resultBggreen");
              } else if (winningresult === "4") {
                $("#hisTextStyle_" + (i + 1)).html("D");
                $("#hisTextStyle_" + (i + 1)).addClass("resultBgBlue");
              } else if (winningresult === "5") {
                $("#hisTextStyle_" + (i + 1)).html("E");
                $("#hisTextStyle_" + (i + 1)).addClass("resultBgPink");
              } else if (winningresult === "6") {
                $("#hisTextStyle_" + (i + 1)).html("F");
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
        const gresultname = data.winner;
        let resultDetail = data.detail.split(" || ");
        let tResult = resultDetail[0];
        let lResult = resultDetail[1];
        let wResult = resultDetail[2];
        let dResult = resultDetail[3];

        if (gresultname == "1") {
          $("#resultName").html("DON");
        } else if (gresultname == "2") {
          $("#resultName").html("AMAR AKHBAR ANTHONY");
        } else if (gresultname == "3") {
          $("#resultName").html("SAHIB BIWI AUR GULAM");
        } else if (gresultname == "4") {
          $("#resultName").html("DHARAM VEER");
        } else if (gresultname == "5") {
          $("#resultName").html("KIS KIS KO PYAR KAROON");
        } else if (gresultname == "6") {
          $("#resultName").html("GHULAM");
        }

        $("#hisDatatxt_0").html(`${tResult}`);
        $("#hisDatatxt_1").html(`${lResult}`);
        $("#hisDatatxt_2").html(`${wResult}`);
        $("#hisDatatxt_3").html(`${dResult}`);

        for (i = 1; i < 2; i++) {
          const cardimg = data[`C${i}`];
          $("#resultimg").append(
            $("<img>", {
              src: API_Img + `images/cards/${cardimg}.png`,
            })
          );
        }
      });
    } catch (error) {}
  }

  $(".resultclosepop").bind("click", function () {
    $(".hisDatatxtStyle").empty();
    $("#resultPopup").hide();
    $("#outerresultborder").hide();
    $(".resultStyle").empty();
    $("#resultName").empty();

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
    $("#resultName").empty();
    $(".resultStyle").empty();
    $("#resultFirstshow").removeClass("winnerimg");
    $("#resultSecondshow").removeClass("winnerimg");
  });

  function betkeyrate(t2) {
    let dataObj = {};
    const rowArr = [
      "don",
      "amar akbar anthony",
      "sahib bibi aur ghulam",
      "dharam veer",
      "kis kisko pyaar karoon",
      "ghulam",
      "odd",
      "dulha dulhan k-q",
      "barati j-a",
      "black",
      "red",
      "card j",
      "card q",
      "card k",
      "card a",
    ];
    rowArr.forEach((row) => {
      let obj = t2.find((i) => i.nat.toLowerCase() == `${row}`);
      if (obj) {
        let rate = obj.rate;
        let sid = obj.sid;
        let layrate = obj.layrate;
        dataObj = { ...dataObj, [row]: { rate, sid, layrate } };
      }
    });

    liveOddsDataObj = {};
    for (let t = 0; t < rowArr.length; t++) {
      const data = rowArr[t];
      liveOddsDataObj[1 + t] = dataObj[data];
      if (t <= 6) {
        $("#betKeyAction_" + (1 + 2 * t)).html(dataObj[data].rate);
        $("#betKeyAction_" + (2 + 2 * t)).html(dataObj[data].layrate);
      } else if (t <= 10) {
        $("#betKeyAction_" + (8 + t)).html(dataObj[data].rate);
      }
    }
    $("#cardRate").html(`Cards : ${dataObj["card j"].rate}`);
  }

  getLast10GameResult();
  let autoTime = 0;
  async function getgameDatat1() {
    let apires;
    try {
      apires = await axios.get(API_URL + "CasinoAdmin/GetData/bwdtblData");
      const t1 = apires.data.data.t1;
      const t2 = apires.data.data.t2;
      // Find

      betkeyrate(t2);
      // clickbetData(t2);

      $("#mindatatxt").html(t1[0]?.min);
      $("#maxdatatxt").html(`${t1[0]?.max} )`);

      mid = apires.data.data.t1[0]?.mid;
      let gameidvalue = mid;
      $("#roundidtxt").html(`Game Round ID : ${gameidvalue}`);
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

        for (let i = 1; i < 2; i++) {
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
          openbetsound();
          $("#gamestart").addClass("betStart");
          $("#stopbettxt").removeClass("stopbetanm");
          window.location.hash = "#gamemenu_container";

          $("#currentResultName").empty();
          $(".dtlcardStyle").empty();

          hidden = true;
          stopbetQut = true;
          firsttimeConnect = false;
          function animationCallBack() {
            let m = Math.ceil(Math.random() * 80);
            clearInterval(betplaceanimation);
            firstUserbetanim();
            betplaceanimation = setInterval(animationCallBack, m * 100);
          }

          function animationCallBack2() {
            let m2 = Math.ceil(Math.random() * 80);
            clearInterval(betplaceanimation2);
            secondUserbetanim();
            betplaceanimation2 = setInterval(animationCallBack2, m2 * 100);
          }

          let m = Math.ceil(Math.random() * 80);
          let m2 = Math.ceil(Math.random() * 80);

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
          // $(".libicard").html("");
          $(".libinnerdatam").html("");
          $(".libinnerdatab").html("");

          $("#gamestart").removeClass("betStart");
          $("#stopbettxt").removeClass("stopbetanm");
        }

        if (gameStatust2 == 1 && timeLeftGame <= 45) {
          gameStartFunction(timeLeftGame);
          hidden = true;
          stopbetQut = true;
        }
        if (gameStatust2 == 0 && timeLeftGame == 0 && hidden) {
          window.location.hash = "#coinamountfield";
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
          // $("#bettingtable_1").removeClass("scalediv");
          // $("#bettingtable_2").removeClass("scalediv");
          setTimeout(function () {
            $("#resultprt").show();
          }, 2500);
          timerclose();
        }
        if (gameStatust2 == 0) {
          $("#numberlock").addClass("numberlock");
          $(".settingprnt").hide();
        }

        if (gameStatust2 == 1 && timeLeftGame <= 45 && firsttimeConnect) {
          function animationCallBack() {
            let m = Math.ceil(Math.random() * 80);
            clearInterval(betplaceanimation);
            firstUserbetanim();
            betplaceanimation = setInterval(animationCallBack, m * 100);
          }

          function animationCallBack2() {
            let m2 = Math.ceil(Math.random() * 80);
            clearInterval(betplaceanimation2);
            secondUserbetanim();
            betplaceanimation2 = setInterval(animationCallBack2, m2 * 100);
          }

          let m = Math.ceil(Math.random() * 80);
          let m2 = Math.ceil(Math.random() * 80);

          betplaceanimation = setInterval(animationCallBack, m * 100);
          betplaceanimation2 = setInterval(animationCallBack2, m2 * 100);

          firsttimeConnect = false;
        }

        getLast10GameResult(5000);
      });
    } catch (error) {
      console.log(error);
    }
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
    $("#numberlock").addClass("numberlock");
    $("#bettinStr").addClass("bettingStartimg");
    $("#bettingText").show();
    $("#bettingText").addClass("bettingStopTxt");
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
    $("#bettinStr").addClass("bettingStartimg");
    $("#bettingText").show();
    $("#bettingText").removeClass("bettingStopTxt");
    $("#bettingText").addClass("bettingStartTxt");
    $(".resultShowBox").hide();
    setTimeout(function () {
      $("#bettingText").removeClass("bettingStartTxt");
    }, 2000);
    setTimeout(function () {
      $("#bettinStr").removeClass("bettingStartimg");
    }, 3000);
    // openbetsound();
    // playbgm();
  }
  // betting table to place bet animation start

  function firstUserbetanim() {
    if (gameStatust2 == 1) {
      $("#firstuserprofile").addClass("firstusershake");
      setTimeout(function () {
        $("#firstuserprofile").removeClass("firstusershake");
      }, 90);
      let b = Math.ceil(Math.random() * 6);
      randomChipPlaceHelper("#selectPoint_" + b);

      $("#" + clickqut + "chip-id").addClass("dummyuser_table" + b);
      coinsSound();
      $("#selectPoint_" + b).addClass("permanetchangebackground removepchbg");
    }
  }
  function secondUserbetanim() {
    if (gameStatust2 == 1) {
      $("#seconduserprofile").addClass("secondUserShake");
      setTimeout(function () {
        $("#seconduserprofile").removeClass("secondUserShake");
      }, 90);

      let t = Math.ceil(Math.random() * 6);

      randomChipPlaceHelper("#selectPoint_" + t);
      $("#" + clickqut + "chip-id").addClass("dummyuser2_table" + t);
      coinsSound();
      $("#selectPoint_" + t).addClass("permanetchangebackground removepchbg");
    }
  }

  function randomChipPlaceHelper(tableId) {
    clickqut++;
    const betcoinvalue = ["1", "2", "3", "4", "5", "6"];
    const coinbetvalue = Math.floor(Math.random() * betcoinvalue.length);
    $("<div/>", {
      id: clickqut + "chip-id",
      class: "betchipimgbgposition",
      style: `background-image: url(../assets/images/${
        betcoinvalue[coinbetvalue]
      }_chip.png); top:${Math.random() * 100 + "%"} ; left:${
        Math.random() * 100 + "%"
      }`,
    }).appendTo(tableId);
  }

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

  // bet confirm popup data start
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

  // bottom keypress button action start
  for (let i = 1; i < 23; i++) {
    $("#betKeyAction_" + i).bind("click", function () {
      if (i % 2 == 0 && i < 15 && i > 0) {
        isBackAct = false;
      } else {
        isBackAct = true;
      }
      if (i == 1 || i == 2) {
        confirmBet = 1;
      } else if (i == 3 || i == 4) {
        confirmBet = 2;
      } else if (i == 5 || i == 6) {
        confirmBet = 3;
      } else if (i == 7 || i == 8) {
        confirmBet = 4;
      } else if (i == 9 || i == 10) {
        confirmBet = 5;
      } else if (i == 11 || i == 12) {
        confirmBet = 6;
      } else if (i == 13 || i == 14) {
        confirmBet = 7;
      } else if (i == 15) {
        confirmBet = 8;
      } else if (i == 16) {
        confirmBet = 9;
      } else if (i == 17) {
        confirmBet = 10;
      } else if (i == 18) {
        confirmBet = 11;
      } else if (i == 19) {
        confirmBet = 12;
      } else if (i == 20) {
        confirmBet = 13;
      } else if (i == 21) {
        confirmBet = 14;
      } else if (i == 22) {
        confirmBet = 15;
      }
      $(".settingprnt").show();
      isbet = true;
      $("#betAmountData").val(`${defaultValue}`);
    });
  }

  $("#betplacebtn").bind("click", function () {
    if (confirmBet < 26 && isbet) {
      $(".settingprnt").hide();

      amount = $("#betAmountData")[0].value;
      if (!isBackAct) {
        gameRate = "layrate";
      } else {
        gameRate = "rate";
      }
      betPlaceApiCall(
        API_TOKEN,
        {
          casinoName: 1,
          isBack: isBackAct,
          odds: liveOddsDataObj[confirmBet][gameRate],
          stake: amount,
          selectionId: liveOddsDataObj[confirmBet].sid,
          placeTime: moment().format("DD-MM-YYYY hh:mm:sss"),
          marketId: mid,
          matchId: 13,
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

          if (confirmBet < 7) {
            coinsSound();
            currentUserBetChipHelper("#selectPoint_" + confirmBet);
            $("#" + clickqut + "chip-id").addClass(
              "userBetPlaceAnim_" + confirmBet
            );
            const obj = {
              // option: "Single:0",
              amount,
            };
            betdata.push(obj);
            actionList.push({ ...obj, type: "Bet Place" });
            betcoins = Number(betcoins) + Number(amount);
            updateUserBalance();

            $("#betcoinetxt").html(betcoins);

            $("#selectPoint_" + confirmBet).addClass(
              "permanetchangebackground removepchbg"
            );
            confirmBet = 60;
          } else if (confirmBet < 26) {
            coinsSound();
            betcoins = Number(betcoins) + Number(amount);
            $("#betcoinetxt").html(betcoins);
            confirmBet = 60;
          }
        }
      );
      isbet = false;
    }
  });

  function updateUserBalance() {
    let temptotalCoins = totalCoins - betcoins;
    $("#totalcoinetxt").text(temptotalCoins);
  }
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
    updateUserBalance();
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
  clearInterval(betplaceanimation);
  clearInterval(betplaceanimation2);

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
  }

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

  function wheelaudio() {
    if (!isMuted) {
      var objPlayMusic = document.createElement("audio");
      objPlayMusic.src = "../media/audio/roulette_spinning_sound.mp3";
      objPlayMusic.play();
      objPlayMusic.addEventListener("ended", removebg);
    }
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
      if (amount) {
        el.setAttribute("title", amount + " chips");
      }
    });
  });
});
