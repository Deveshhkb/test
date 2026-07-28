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
  // for (let i = 3; i < 7; i++) {
  //   $("<div/>", {
  //     id: "bettingtable_" + i,
  //     class: "bettingtableStyle_" + i,
  //   }).appendTo("#bettingTable_container_secondRow");
  // }

  $("<div/>", {
    id: "dragonTigerBg",
    class: "dragonTigerBgStyle",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "topSection",
    class: "topSectionStyle",
  }).appendTo("#dragonTigerBg");
  $("<div/>", {
    id: "midSection",
    class: "midSectionStyle",
  }).appendTo("#dragonTigerBg");
  $("<div/>", {
    id: "bottomSection",
    class: "bottomSectionStyle",
  }).appendTo("#dragonTigerBg");

  $("<div/>", {
    id: "bottomFirstSection",
    class: "bottomFirstSectionStyle",
  }).appendTo("#bottomSection");
  $("<div/>", {
    id: "bottomSecondSection",
    class: "bottomFirstSectionStyle",
  }).appendTo("#bottomSection");
  $("<div/>", {
    id: "dargonrate",
    class: "dargonrateStyle",
  }).appendTo("#bottomFirstSection");
  $("<div/>", {
    id: "tigerrate",
    class: "tigerrateStyle",
  }).appendTo("#bottomFirstSection");
  $("<div/>", {
    id: "libdataprt",
    class: "libdataprtStyle",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "libtopSection",
    class: "libtopSectionStyle",
  }).appendTo("#libdataprt");
  $("<div/>", {
    id: "libmidSection",
    class: "libmidSectionStyle",
  }).appendTo("#libdataprt");
  $("<div/>", {
    id: "libbottomSection",
    class: "libbottomSectionStyle",
  }).appendTo("#libdataprt");

  $("<div/>", {
    id: "libbottomFirstSection",
    class: "libbottomFirstSectionStyle",
  }).appendTo("#libbottomSection");
  $("<div/>", {
    id: "libbottomSecondSection",
    class: "libbottomFirstSectionStyle",
  }).appendTo("#libbottomSection");

  for (let d = 1; d < 5; d++) {
    $("<div/>", {
      id: "betKeyAction_" + d,
      class: "betKeyActionStyle_" + d,
    }).appendTo("#topSection");
    $("<div/>", {
      id: "liabilityData_" + d,
      class: "liabilityData_1",
    }).appendTo("#libtopSection");
  }
  for (let e = 5; e < 13; e++) {
    $("<div/>", {
      id: "betKeyAction_" + e,
      class: "betKeymActionStyle",
    }).appendTo("#midSection");

    $("<div/>", {
      id: "liabilityData_" + e,
      class: "liabilityData",
    }).appendTo("#libmidSection");
  }
  for (let e = 13; e < 26; e++) {
    $("<div/>", {
      id: "betKeyAction_" + e,
      class: "betKeybActionStyle",
    }).appendTo("#bottomFirstSection");

    $("<div/>", {
      id: "liabilityData_" + e,
      class: "liabilityData_2",
    }).appendTo("#libbottomFirstSection");
  }
  for (let e = 26; e < 39; e++) {
    $("<div/>", {
      id: "betKeyAction_" + e,
      class: "betKeybActionStyle",
    }).appendTo("#bottomSecondSection");

    $("<div/>", {
      id: "liabilityData_" + e,
      class: "liabilityData_2",
    }).appendTo("#libbottomSecondSection");
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
