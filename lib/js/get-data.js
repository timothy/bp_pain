//adapted from the cerner smart on fhir guide. updated to utalize client.js v2 library and FHIR R4

// helper function to process fhir resource to get the patient name.
function getPatientName(pt) {
  if (pt.name) {
    var names = pt.name.map(function(name) {
      return name.given.join(" ") + " " + name.family;
    });
    return names.join(" / ")
  } else {
    return "anonymous";
  }
}

// display the patient name gender and dob in the index page
function displayPatient(pt) {
  document.getElementById('patient_name').innerHTML = getPatientName(pt);
  document.getElementById('gender').innerHTML = pt.gender;
  document.getElementById('dob').innerHTML = pt.birthDate;
}

//function to display list of medications
function displayMedication(meds) {
  med_list.innerHTML += "<li> " + meds + "</li>";
}

//helper function to get quanity and unit from an observation resoruce.
function getQuantityValueAndUnit(ob) {
  if (typeof ob != 'undefined' &&
    typeof ob.valueQuantity != 'undefined' &&
    typeof ob.valueQuantity.value != 'undefined' &&
    typeof ob.valueQuantity.unit != 'undefined') {
    return Number(parseFloat((ob.valueQuantity.value)).toFixed(2)) + ' ' + ob.valueQuantity.unit;
  } else {
    return undefined;
  }
}

// helper function to get both systolic and diastolic bp
function getBloodPressureValue(BPObservations, typeOfPressure) {
  var formattedBPObservations = [];
  BPObservations.forEach(function(observation) {
    var BP = observation.component.find(function(component) {
      return component.code.coding.find(function(coding) {
        return coding.code == typeOfPressure;
      });
    });
    if (BP) {
      observation.valueQuantity = BP.valueQuantity;
      formattedBPObservations.push(observation);
    }
  });

  return getQuantityValueAndUnit(formattedBPObservations[0]);
}

// create a patient object to initalize the patient
function defaultPatient() {
  return {
    height: {
      value: ''
    },
    weight: {
      value: ''
    },
    sys: {
      value: ''
    },
    dia: {
      value: ''
    },
    ldl: {
      value: ''
    },
    hdl: {
      value: ''
    },
    note: 'No Annotation',
  };
}

//helper function to display the annotation on the index page
function displayAnnotation(annotation) {
  note.innerHTML = annotation;
}

//function to display the observation values you will need to update this
function displayObservation(obs) {
  hdl.innerHTML = obs.hdl;
  ldl.innerHTML = obs.ldl;
  sys.innerHTML = obs.sys;
  dia.innerHTML = obs.dia;
  weight.innerHTML = obs.weight;
  height.innerHTML = obs.height;
}
let _GLOBAL_weight
//once fhir client is authorized then the following functions can be executed
FHIR.oauth2.ready().then(function(client) {
  // get patient object and then display its demographics info in the banner
  client.request(`Patient/${client.patient.id}`).then(
    function(patient) {
      displayPatient(patient);
      console.log(patient);
    }
  );

  // get observation resoruce values
  // you will need to update the below to retrive the weight and height values
  let query = new URLSearchParams();

  query.set("patient", client.patient.id);
  query.set("_count", 100);
  query.set("_sort", "-date");
  query.set("code", [
    'http://loinc.org|8462-4',
    'http://loinc.org|8480-6',
    'http://loinc.org|2085-9',
    'http://loinc.org|2089-1',
    'http://loinc.org|55284-4',
    'http://loinc.org|3141-9',
    'http://loinc.org|29463-7',
    'http://loinc.org|8302-2',
  ].join(","));


  client.request("Observation?" + query, {
    pageLimit: 0,
    flat: true
  }).then((ob) => {

    // group all of the observation resources by type into their own
    const byCodes = client.byCodes(ob, 'code');


    //console.log(height, weight, "h and w")
    const systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
    const diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
    const hdl = byCodes('2085-9');
    const ldl = byCodes('2089-1');

    // create patient object
    const p = defaultPatient();

    // set patient value parameters to the data pulled from the observation resource
    if (typeof systolicbp != 'undefined') {
      p.sys = systolicbp;
    } else {
      p.sys = 'undefined'
    }

    if (typeof diastolicbp != 'undefined') {
      p.dia = diastolicbp;
    } else {
      p.dia = 'undefined'
    }

    _GLOBAL_weight = byCodes("29463-7")//make global so we can use later
    let height = byCodes("8302-2")

    p.height = getQuantityValueAndUnit(height[0]);
    p.weight = getQuantityValueAndUnit(_GLOBAL_weight[0]);
    p.hdl = getQuantityValueAndUnit(hdl[0]);
    p.ldl = getQuantityValueAndUnit(ldl[0]);


    displayObservation(p)

  });


  client.request("MedicationRequest?patient=" + client.patient.id, {
    pageLimit: 0,
    flat: true
  }).then(
      function (mr) {
        for (let m of mr) {//Display medication list
          displayMedication(m.medicationCodeableConcept.text);
        }
      });

  //update function to take in text input from the app and add the note for the latest weight observation annotation
  //you should include text and the author can be set to anything of your choice. keep in mind that this data will
  // be posted to a public sandbox
  function addWeightAnnotation() {
    const annotation = document.getElementById('annotation').value;

    let curtime = new Date().toISOString()

    _GLOBAL_weight.note = [];
    _GLOBAL_weight.note.push({
      authorString: "tbradford8",
      time: curtime,
      text: annotation
    });

    // client.update(_GLOBAL_weight).then((data) => {
    //   console.log(data,"return from update!")//response dat
    //   //displayAnnotation(`${annotation} (Author:tbradford8 Time:${curtime})`);
    // })

    client.request({
      url: `${_GLOBAL_weight[0].resourceType}/${_GLOBAL_weight[0].id}`,
      method: "PUT",
      body: _GLOBAL_weight
    }).then((data) => {
      console.log(data,"response for the update")//response data
      displayAnnotation(annotation);
    })

    displayAnnotation(`${annotation} (Author:tbradford8 Time:${curtime})`);
    //event listner when the add button is clicked to call the function that will add the note to the weight observation

    // Practitioner//Request URL: https://launch.smarthealthit.org/v/r4/fhir/Patient/fc200fa2-12c9-4276-ba4a-e0601d424e55/$everything?_count=500
    // client.request("Patient/" + client.patient.id + "/$everything?_count=500", {
    //   pageLimit: 0,
    //   flat: true
    // }).then((author) => {
    //   console.log(author)
    //   let practitioner = "Dr. Jones"
    //   for (let auth of author) {
    //     if (auth.resourceType == "Practitioner") {
    //       practitioner = auth.name[0].prefix[0] + " " + auth.name[0].family
    //       break;
    //     }
    //   }
    //
    //

    // });
  }


  document.getElementById('add').addEventListener('click', addWeightAnnotation);


}).catch(console.error);
