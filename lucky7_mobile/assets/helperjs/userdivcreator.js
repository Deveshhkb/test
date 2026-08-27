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
  // for (let i = 1; i < 3; i++) {
  //   $("<div/>", {
  //     id: "bettingtable_" + i,
  //     class: "bettingtableStyle_" + i,
  //   }).appendTo("#bettingTable_container");
  // }
  for (let i = 1; i < 7; i++) {
    $("<div/>", {
      id: "playerOdsBtn_" + i,
      class: "playerOdsBtnstyle_" + i,
    }).appendTo("#gamePlayerOds");
    $("<div/>", {
      id: "libinnerdata_" + i,
      class: "libinnerdata",
    }).appendTo("#liabiPlayerOds");

    $("<div/>", {
      id: "selectPoint_" + i,
      class: "selectPointStyle_" + i,
    }).appendTo("#bettingTable_container");
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

  $("<div/>", {
    id: "table_1",
    class: "firstbetplaceprntstyle",
  }).appendTo("#bettingtable_1");
  $("<div/>", {
    id: "table_2",
    class: "secondbetplaceprntstyle",
  }).appendTo("#bettingtable_2");
  $("<div/>", {
    id: "seconduserwin",
  }).appendTo("#resultcup");
  $("<div/>", {
    id: "firstuserwin",
  }).appendTo("#resultcup");
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

  for (let i = 0; i < 5; i++) {
    $("<div/>", {
      id: "hisDatatxt_" + i,
      class: "hisDatatxtStyle",
    }).appendTo("#resultdetail");
  }

  $("<div/>", {
    id: "mybetnumber",
    class: "mybetnumberStyle",
    html: 0,
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

  // for (let i = 1; i < 7; i++) {
  //   $("<div/>", {
  //     id: "resultimg" + i,
  //     class: "resultStyle",
  //   }).appendTo("#resultimgprt");
  // }
}
