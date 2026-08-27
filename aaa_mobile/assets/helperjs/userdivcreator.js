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
  for (let i = 1; i < 4; i++) {
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
    id: "upperbtn",
    class: "upperbtnStyle",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "dataKeyAct",
    class: "dataKeyAct",
  }).appendTo("#bettingbtnbot");

  $("<div/>", {
    id: "lowerbtn",
    class: "lowerbtnStyle",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "betactioncard",
    class: "dragonbtncard",
  }).appendTo("#bettingbtnbot");

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
    id: "libdataprn",
  }).appendTo("#bettingbtnbot");

  $("<div/>", {
    id: "libicard_data",
  }).appendTo("#bettingbtnbot");

  for (let d = 1; d < 4; d++) {
    $("<div/>", {
      id: "betKeymn_" + d,
      class: "betKeyAction",
    }).appendTo("#upperbtn");
    for (let i = 1; i < 3; i++) {
      $("<div/>", {
        id: "betKeyAction_" + (i + 2 * (d - 1)),
        class: "innerDataStyle",
      }).appendTo("#betKeymn_" + d);
    }
  }

  for (let d = 7; d < 13; d++) {
    $("<div/>", {
      id: "betKeyAction_" + d,
      class: "betKeyActionStyle",
    }).appendTo("#lowerbtn");
    $("<div/>", {
      id: "libinnerdata_" + d,
      class: "libinnerdatam",
      // html: "0",
    }).appendTo("#libdataprn");
  }

  for (let d = 13; d < 26; d++) {
    $("<div/>", {
      id: "betKeyAction_" + d,
      class: "betKeycard",
    }).appendTo("#betactioncard");
    $("<div/>", {
      id: "libinnerdata_" + d,
      class: "libicard",
      // html: "0",
    }).appendTo("#libicard_data");
  }

  for (i = 1; i < 7; i++) {
    $("<div/>", {
      id: "libinnerdata_" + i,
      class: "libinnerdata",
      // html: "0",
    }).appendTo("#upperbtn");
  }

  for (let i = 1; i < 2; i++) {
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
    id: "currentResultName",
    class: "currentResultStyle",
  }).appendTo("#resultprt");

  $("<div/>", {
    id: "currentResultDtl",
    class: "currentResultdtlStyle",
  }).appendTo("#resultprt");

  for (let i = 1; i < 5; i++) {
    $("<div/>", {
      id: "dtlcard_" + i,
      class: "dtlcardStyle",
    }).appendTo("#currentResultDtl");
  }

  $("<div/>", {
    id: "selectPoint_1",
    class: "firstbetplaceprntstyle",
  }).appendTo("#bettingtable_1");

  $("<div/>", {
    id: "selectPoint_2",
    class: "secondbetplaceprntstyle",
  }).appendTo("#bettingtable_2");

  $("<div/>", {
    id: "selectPoint_3",
    class: "thirdbetplaceprntstyle",
  }).appendTo("#bettingtable_3");

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

  $("<div/>", {
    id: "resultName",
    class: "resultNameStyle",
  }).appendTo("#resultimgprt");

  for (let i = 0; i < 4; i++) {
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
