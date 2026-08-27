function userCreatorDiv() {
  $("<div/>", {
    id: "firstuserprofile",
    class: "firstuserprofileStyle",
  }).appendTo("#activeUser_container");

  $("<div/>", {
    id: "seconduserprofile",
    class: "usersecfileSctStyle",
  }).appendTo("#activeUser_container");

  $("<div/>", {
    id: "secondactprofile",
    class: "usersecfileactStyle",
  }).appendTo("#activeUser_container");
  for (let i = 1; i < 9; i++) {
    $("<div/>", {
      id: "selectPoint_" + i,
      class: "firstbetplaceprntstyle",
    }).appendTo("#bettingTable_container");
  }

  $("<div/>", {
    id: "upperbtn",
    class: "upperbtnStyle",
  }).appendTo("#bettingbtnbot");

  $("<div/>", {
    id: "libidatatxt",
    class: "libidatatxt",
  }).appendTo("#bettingbtnbot");

  for (let d = 1; d <= 8; d++) {
    $("<div/>", {
      id: "betKeymn_" + d,
      class: "betKeyAction",
    }).appendTo("#upperbtn");
    $("<div/>", {
      id: "libinnerdatad_" + d,
      class: "libinnerdatad",
    }).appendTo("#libidatatxt");
    for (let i = 1; i < 3; i++) {
      $("<div/>", {
        id: "betKeyAction_" + (i + 2 * (d - 1)),
        class: "innerDataStyle",
      }).appendTo("#betKeymn_" + d);
      $("<div/>", {
        id: "libinnerdata_" + (i + 2 * (d - 1)),
        class: "libinnerdata",
        // html: 0,
      }).appendTo("#libinnerdatad_" + d);
    }
  }

  for (let t = 1; t <= 9; t++) {
    $("<div/>", {
      id: "mainPlayer_" + t,
      class: "mainPlayerStyle",
    }).appendTo("#resultprt");

    $("<div/>", {
      id: "mainPlayerbtn_" + t,
      class: "mainPlayerbtnStyle",
    }).appendTo("#mainPlayer_" + t);
    for (let r = 1; r <= 3; r++) {
      $("<div/>", {
        id: "cardrh_" + (t + 9 * (r - 1)),
        class: "cardrhStyle",
      }).appendTo("#mainPlayerbtn_" + t);
    }
    if (t <= 8) {
      $("<div/>", {
        id: "mainbtn_" + t,
        class: "mainbtnStyle",
        html: "PLAYER " + t,
      }).appendTo("#mainPlayer_" + t);
    } else {
      $("<div/>", {
        id: "mainbtn_" + t,
        class: "mainbtnStyle",
        html: "DEALER ",
      }).appendTo("#mainPlayer_" + t);
    }
  }

  for (let i = 1; i < 28; i++) {
    $("<div/>", {
      id: "card" + i,
      class: "card",
    }).appendTo("#cardrh_" + i);
    $("<div/>", {
      id: "selectdata_" + i,
      class: "card-inner",
    }).appendTo("#card" + i);
    $("<div/>", {
      id: "card-front_" + i,
      class: "card-front",
    }).appendTo("#selectdata_" + i);
    $("<div/>", {
      id: "card-back_" + i,
      class: "card-back",
    }).appendTo("#selectdata_" + i);
  }

  // $("<div/>", {
  //   id: "selectPoint_1",
  //   class: "firstbetplaceprntstyle",
  // }).appendTo("#bettingtable_1");

  // $("<div/>", {
  //   id: "selectPoint_2",
  //   class: "secondbetplaceprntstyle",
  // }).appendTo("#bettingtable_2");

  // $("<div/>", {
  //   id: "selectPoint_3",
  //   class: "thirdbetplaceprntstyle",
  // }).appendTo("#bettingtable_3");

  $("<div/>", {
    id: "resultimgprt",
    class: "resultptrStyle",
  }).appendTo("#resultPopup");
  $("<div/>", {
    id: "resultimg",
    class: "resultStyle",
  }).appendTo("#resultimgprt");
  $("<div/>", {
    id: "resultdetail",
    class: "resultdetailStyle",
  }).appendTo("#resultimgprt");

  for (let i = 0; i < 3; i++) {
    $("<div/>", {
      id: "hisDatatxt_" + i,
      class: "hisDatatxtStyle",
    }).appendTo("#resultdetail");
  }

  $("<div/>", {
    id: "mybetnumber",
    class: "mybetnumberStyle",
    html: "0",
  }).appendTo("#mybetsection");

  $("<div/>", {
    id: "mindata",
    class: "mindataStyle",
    html: "( Min :",
  }).appendTo("#mainprntData");
  $("<div/>", {
    id: "maxdata",
    class: "maxdataStyle",
    html: "Max :",
  }).appendTo("#mainprntData");
  $("<div/>", {
    id: "mindatatxt",
    class: "mindatatxtStyle",
  }).appendTo("#mindata");

  $("<div/>", {
    id: "maxdatatxt",
    class: "maxdatatxtStyle",
  }).appendTo("#maxdata");
  for (let t = 1; t <= 9; t++) {
    $("<div/>", {
      id: "aftresmainPlayer_" + t,
      class: "aftresmainPlayerStyle",
    }).appendTo("#resultimg");

    $("<div/>", {
      id: "aftresmainPlayerbtn_" + t,
      class: "aftresmainPlayerbtnStyle",
    }).appendTo("#aftresmainPlayer_" + t);
    // for (let r = 1; r <= 3; r++) {
    //   $("<div/>", {
    //     id: "aftrescardrh_" + (t + 9 * (r - 1)),
    //     class: "aftrescardrhStyle",
    //   }).appendTo("#aftresmainPlayerbtn_" + t);
    // }
    $("<div/>", {
      id: "aftrescardrh_" + (t + 9 * 0),
      class: "aftrescardrhStyle firstCardAnm",
    }).appendTo("#aftresmainPlayerbtn_" + t);
    $("<div/>", {
      id: "aftrescardrh_" + (t + 9 * 1),
      class: "aftrescardrhStyle secondCardAnm",
    }).appendTo("#aftresmainPlayerbtn_" + t);
    $("<div/>", {
      id: "aftrescardrh_" + (t + 9 * 2),
      class: "aftrescardrhStyle thirdCardAnm",
    }).appendTo("#aftresmainPlayerbtn_" + t);

    if (t <= 8) {
      $("<div/>", {
        id: "aftresmainbtn_" + t,
        class: "aftresmainbtnStyle",
        html: "PLAYER " + t,
      }).appendTo("#aftresmainPlayer_" + t);
    } else {
      $("<div/>", {
        id: "aftresmainbtn_" + t,
        class: "aftresmainbtnStyle",
        html: "DEALER ",
      }).appendTo("#aftresmainPlayer_" + t);
    }
  }
}
