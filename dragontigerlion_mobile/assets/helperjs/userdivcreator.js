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
    id: "lionhbbtn",
    class: "lionhbbtnStyle",
    html: "LION",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "dragonprnt",
    class: "dragonprntStyle",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "tigerprnt",
    class: "dragonprntStyle",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "lionprnt",
    class: "dragonprntStyle",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "libdragonprnt",
    class: "libdragonprntStyle",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "libtigerprnt",
    class: "libdragonprntStyle",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "liblionprnt",
    class: "libdragonprntStyle",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "leftd",
    class: "leftdStyle",
  }).appendTo("#dragonprnt");
  $("<div/>", {
    id: "rightd",
    class: "leftdStyle",
  }).appendTo("#dragonprnt");
  $("<div/>", {
    id: "leftt",
    class: "leftdStyle",
  }).appendTo("#tigerprnt");
  $("<div/>", {
    id: "rightt",
    class: "leftdStyle",
  }).appendTo("#tigerprnt");
  $("<div/>", {
    id: "leftl",
    class: "leftdStyle",
  }).appendTo("#lionprnt");
  $("<div/>", {
    id: "rightl",
    class: "leftdStyle",
  }).appendTo("#lionprnt");
  $("<div/>", {
    id: "libleftd",
    class: "libleftdStyle",
  }).appendTo("#libdragonprnt");
  $("<div/>", {
    id: "librightd",
    class: "libleftdStyle",
  }).appendTo("#libdragonprnt");
  $("<div/>", {
    id: "libleftt",
    class: "libleftdStyle",
  }).appendTo("#libtigerprnt");
  $("<div/>", {
    id: "librightt",
    class: "libleftdStyle",
  }).appendTo("#libtigerprnt");
  $("<div/>", {
    id: "libleftl",
    class: "libleftdStyle",
  }).appendTo("#liblionprnt");
  $("<div/>", {
    id: "librightl",
    class: "libleftdStyle",
  }).appendTo("#liblionprnt");
  $("<div/>", {
    id: "dataKeyAct",
    class: "dataKeyAct",
  }).appendTo("#bettingbtnbot");

  for (let i = 1; i <= 9; i++) {
    $("<div/>", {
      id: "betKeyAction_" + i,
      class: "betKeyStyle",
    }).appendTo("#leftd");
    $("<div/>", {
      id: "betKeyAction_" + (i + 9),
      class: "betKeyStyle",
    }).appendTo("#rightd");
    $("<div/>", {
      id: "betKeyAction_" + (i + 18),
      class: "betKeyStyle",
    }).appendTo("#leftt");
    $("<div/>", {
      id: "betKeyAction_" + (i + 27),
      class: "betKeyStyle",
    }).appendTo("#rightt");
    $("<div/>", {
      id: "betKeyAction_" + (i + 36),
      class: "betKeyStyle",
    }).appendTo("#leftl");
    $("<div/>", {
      id: "betKeyAction_" + (i + 45),
      class: "betKeyStyle",
    }).appendTo("#rightl");
    $("<div/>", {
      id: "liabilityData_" + i,
      class: "liability",
      // html: "0",
    }).appendTo("#libleftd");
    $("<div/>", {
      id: "liabilityData_" + (i + 9),
      class: "liability",
      // html: "0",
    }).appendTo("#librightd");
    $("<div/>", {
      id: "liabilityData_" + (i + 18),
      class: "liability",
      // html: "0",
    }).appendTo("#libleftt");
    $("<div/>", {
      id: "liabilityData_" + (i + 27),
      class: "liability",
      // html: "0",
    }).appendTo("#librightt");
    $("<div/>", {
      id: "liabilityData_" + (i + 36),
      class: "liability",
      // html: "0",
    }).appendTo("#libleftl");
    $("<div/>", {
      id: "liabilityData_" + (i + 45),
      class: "liability",
      // html: "0",
    }).appendTo("#librightl");
  }

  for (let i = 1; i < 4; i++) {
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
  for (let i = 1; i <= 3; i++) {
    $("<div/>", {
      id: "selectPoint_" + i,
      class: "firstbetplaceprntstyle",
    }).appendTo("#bettingtable_" + i);
  }

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
