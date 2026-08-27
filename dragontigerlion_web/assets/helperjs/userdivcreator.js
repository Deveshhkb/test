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

  $("<div/>", {
    id: "usernameid",
    class: "usernameidStyle",
  }).appendTo("#secondactprofile");

  for (let i = 1; i < 4; i++) {
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
    id: "leftbetDataKeyAct",
    class: "tableStyle",
  }).appendTo("#bettingbtnbot");

  $("<div/>", {
    id: "rightbetDataKeyAct",
    class: "tableStyle",
  }).appendTo("#bettingbtnbot");

  for (let d = 1; d < 10; d++) {
    $("<div/>", {
      id: "betDatabg_" + d,
      class: "tblStyle",
    }).appendTo("#leftbetDataKeyAct");
    $("<div/>", {
      id: "liabilityData_" + d,
      class: "liabilityData",
    }).appendTo("#leftbetDataKeyAct");
    for (let i = 1; i < 4; i++) {
      $("<div/>", {
        id: "betinnerdata_" + (i + 3 * (d - 1)),
        class: "innerDataStyle",
      }).appendTo("#betDatabg_" + d);
      $("<div/>", {
        id: "libinnerdata_" + (i + 3 * (d - 1)),
        class: "libinnerdata",
      }).appendTo("#liabilityData_" + d);
    }
  }
  for (let d = 10; d < 19; d++) {
    $("<div/>", {
      id: "betDatabg_" + d,
      class: "tblStyle",
    }).appendTo("#rightbetDataKeyAct");
    $("<div/>", {
      id: "liabilityData_" + d,
      class: "liabilityData",
    }).appendTo("#rightbetDataKeyAct");
    for (let i = 1; i < 4; i++) {
      $("<div/>", {
        id: "betinnerdata_" + (i + 3 * (d - 1)),
        class: "innerDataStyle",
      }).appendTo("#betDatabg_" + d);
      $("<div/>", {
        id: "libinnerdata_" + (i + 3 * (d - 1)),
        class: "libinnerdata",
      }).appendTo("#liabilityData_" + d);
    }
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

    $("<div/>", {
      id: "selectPoint_" + i,
      class: "betTablePlaceBet",
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
