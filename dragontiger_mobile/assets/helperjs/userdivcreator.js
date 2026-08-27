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
  for (let i = 1; i < 3; i++) {
    $("<div/>", {
      id: "bettingtable_" + i,
      class: "bettingtableStyle_" + i,
    }).appendTo("#bettingTable_container");
  }

  $("<div/>", {
    id: "cardRate",
    class: "cardRateStyle",
    html: "12",
  }).appendTo("#bettingbtnbot");

  $("<div/>", {
    id: "dragonhbbtn",
    class: "dragonhbbtnStyle",
    html: "DRAGON",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "tigerhbbtn",
    class: "tigerhbbtnStyle",
    html: "TIGER",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "upperbtn",
    class: "upperbtnStyle",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "dataKeyAct",
    class: "dataKeyAct",
  }).appendTo("#bettingbtnbot");

  $("<div/>", {
    id: "dragonTigerBg",
    class: "dragonTigerBgStyle",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "dragonbtnSection",
    class: "dragonbtnSectionStyle",
  }).appendTo("#dragonTigerBg");

  $("<div/>", {
    id: "dragonbtnSectioncard",
    class: "dragonbtncard",
  }).appendTo("#dragonTigerBg");
  $("<div/>", {
    id: "tigerbtnSection",
    class: "tigerbtnSectionStyle",
  }).appendTo("#dragonTigerBg");
  $("<div/>", {
    id: "tigerbtnSectioncard",
    class: "tigerbtncard",
  }).appendTo("#dragonTigerBg");

  $("<div/>", {
    id: "cardsection1",
    class: "cardsection1",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "cardsection2",
    class: "cardsection1",
  }).appendTo("#bettingbtnbot");

  for (let i = 1; i < 5; i++) {
    $("<div/>", {
      id: "betKeyAction_" + i,
      class: "betKeyStyle_" + i,
    }).appendTo("#upperbtn");
    $("<div/>", {
      id: "liabilityData_" + i,
      class: "liability",
    }).appendTo("#dataKeyAct");
  }

  for (let d = 5; d < 9; d++) {
    $("<div/>", {
      id: "betKeyAction_" + d,
      class: "betKeyActionStyle",
    }).appendTo("#dragonbtnSection");
    $("<div/>", {
      id: "liabilityData_" + d,
      class: "liability",
    }).appendTo("#dragonbtnSection");
  }

  for (let d = 13; d < 26; d++) {
    $("<div/>", {
      id: "betKeyAction_" + d,
      class: "betKeycard",
    }).appendTo("#dragonbtnSectioncard");
    $("<div/>", {
      id: "liabilityData_" + d,
      class: "cardfg",
    }).appendTo("#cardsection1");
  }

  for (let e = 9; e < 13; e++) {
    $("<div/>", {
      id: "betKeyAction_" + e,
      class: "betKeyActionStyle",
    }).appendTo("#tigerbtnSection");
    $("<div/>", {
      id: "liabilityData_" + e,
      class: "liability",
    }).appendTo("#tigerbtnSection");
  }
  for (let e = 26; e < 39; e++) {
    $("<div/>", {
      id: "betKeyAction_" + e,
      class: "betKeycard",
    }).appendTo("#tigerbtnSectioncard");
    $("<div/>", {
      id: "liabilityData_" + e,
      class: "cardfg",
    }).appendTo("#cardsection2");
  }

  for (let i = 1; i < 3; i++) {
    $("<div/>", {
      id: "cardplace_" + i,
    }).appendTo("#resultprt");
    $("<div/>", {
      id: "card" + i,
      class: "card",
    }).appendTo("#cardplace_" + i);
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

  $("<div/>", {
    id: "selectPoint_1",
    class: "firstbetplaceprntstyle",
  }).appendTo("#bettingtable_1");
  // $("<div/>", {
  //   id: "firstuserwin",
  // }).appendTo("#bettingtable_1");
  $("<div/>", {
    id: "selectPoint_2",
    class: "secondbetplaceprntstyle",
  }).appendTo("#bettingtable_2");
  // $("<div/>", {
  //   id: "seconduserwin",
  // }).appendTo("#bettingtable_2");

  $("<div/>", {
    id: "selectPoint_3",
    class: "betTablePlaceBet",
  }).appendTo("#bettingtable_3");
  $("<div/>", {
    id: "selectPoint_4",
    class: "betTablePlaceBet",
  }).appendTo("#bettingtable_4");
  $("<div/>", {
    id: "selectPoint_5",
    class: "betTablePlaceBet",
  }).appendTo("#bettingtable_5");
  $("<div/>", {
    id: "selectPoint_6",
    class: "betTablePlaceBet",
  }).appendTo("#bettingtable_6");

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
}
