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

  for (let i = 1; i < 3; i++) {
    $("<div/>", {
      id: "bettingtable_" + i,
      class: "bettingtableStyle_" + i,
    }).appendTo("#bettingTable_container");
  }
  for (let i = 1; i < 7; i++) {
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
    id: "playerA_txt",
    class: "playerA_txtStyle",
    html: "Player A",
  }).appendTo("#resultPopup");
  $("<div/>", {
    id: "playerB_txt",
    class: "playerB_txtStyle",
    html: "Player B",
  }).appendTo("#resultPopup");

  $("<div/>", {
    id: "table_1",
    class: "firstbetplaceprntstyle",
  }).appendTo("#bettingtable_1");
  $("<div/>", {
    id: "firstuserwin",
  }).appendTo("#resultcup");
  $("<div/>", {
    id: "table_2",
    class: "secondbetplaceprntstyle",
  }).appendTo("#bettingtable_2");
  $("<div/>", {
    id: "seconduserwin",
  }).appendTo("#resultcup");

  $("<div/>", {
    id: "resultimgprt",
    class: "resultptrStyle",
  }).appendTo("#resultPopup");

  for (let i = 1; i < 7; i++) {
    $("<div/>", {
      id: "resultimg" + i,
      class: "resultStyle",
    }).appendTo("#resultimgprt");
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
