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
    id: "allcartRate",
    class: "allcartRateStyle",
  }).appendTo("#bettingbtnbot");

  $("<div/>", {
    id: "topbetDataKeyAct",
    class: "tableStyle",
  }).appendTo("#bettingbtnbot");

  $("<div/>", {
    id: "midbetDataKeyAct",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "libdataprn",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "bottombetDataKeyAct",
  }).appendTo("#bettingbtnbot");
  $("<div/>", {
    id: "libicard_data",
  }).appendTo("#bettingbtnbot");

  for (let d = 1; d < 4; d++) {
    $("<div/>", {
      id: "betDatabg_" + d,
      class: "tblStyle",
    }).appendTo("#topbetDataKeyAct");
    for (let i = 1; i < 3; i++) {
      $("<div/>", {
        id: "betinnerdata_" + (i + 2 * (d - 1)),
        class: "innerDataStyle",
      }).appendTo("#betDatabg_" + d);
    }
  }

  for (let h = 7; h < 13; h++) {
    $("<div/>", {
      id: "betinnerdata_" + h,
      class: "midtxtstyle",
    }).appendTo("#midbetDataKeyAct");

    $("<div/>", {
      id: "libinnerdata_" + h,
      class: "libinnerdatam",
      // html: "0",
    }).appendTo("#libdataprn");
  }
  for (let h = 13; h < 26; h++) {
    $("<div/>", {
      id: "betinnerdata_" + h,
      class: "botomtxtstyle",
    }).appendTo("#bottombetDataKeyAct");
    $("<div/>", {
      id: "libinnerdata_" + h,
      class: "libicard",
      // html: "0",
    }).appendTo("#libicard_data");
  }

  for (i = 1; i < 7; i++) {
    $("<div/>", {
      id: "libinnerdata_" + i,
      class: "libinnerdata",
      // html: "0",
    }).appendTo("#bottombetDataKeyAct");
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
    id: "resultimgprt",
    class: "resultptrStyle",
  }).appendTo("#resultPopup");
  $("<div/>", {
    id: "resultimg",
    class: "resultStyle",
  }).appendTo("#resultimgprt");
  $("<div/>", {
    id: "resultName",
    class: "resultNameStyle",
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
    $("<div/>", {
      id: "selectPoint_" + i,
      class: "betTablePlaceBet",
    }).appendTo("#bettingtable_" + i);
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
