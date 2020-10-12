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



//once fhir client is authorized then the following functions can be executed
FHIR.oauth2.ready().then(function(client) {
  // get patient object and then display its demographics info in the banner
  client.request(`Patient/${client.patient.id}`).then(
    function(patient) {
      displayPatient(patient);
      console.log(patient);
    }
  );
// helper function to process fhir resource to get the patient name.
  const getPatientName = (pt) => {
    if (pt.name) {
      let names = pt.name.map(function (name) {
        return name.given.join(" ") + " " + name.family;
      });
      return names.join(" / ")
    } else {
      return "anonymous";
    }
  }

  const getQuantityValueAndUnit = (ob) => {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
      return Number(parseFloat(ob.valueQuantity.value).toFixed(4));
    } else {
      return undefined;
    }
  }

  const getBloodPressureValue = (BPObservations, typeOfPressure) => {
    let BP_array = [];
    BPObservations.forEach(function (observation) {
      let BP = observation.component.find(function (component) {
        return component.code.coding.find(function (coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        BP_array.push(BP)
      }
    });

    return BP_array.length > 0 ? BP_array : false;
  }

  let query = new URLSearchParams();

  query.set("patient", client.patient.id);
  query.set("_count", 100);
  query.set("_sort", "-date");
  query.set("code", [
    'http://loinc.org|72514-3',
    'http://loinc.org|8462-4',
    'http://loinc.org|8480-6',
    'http://loinc.org|55284-4',
    'http://loinc.org|3141-9',
    'http://loinc.org|29463-7',
    'http://loinc.org|8302-2',
  ].join(","));

//function to display the observation values you will need to update this

//function to display the observation values you will need to update this
  const displayObservation = (obs) => {
    thisPain.innerHTML = obs.thisPain
    lastPain.innerHTML = obs.lastPain
    sys.innerHTML = obs.systolicBP
    dia.innerHTML = obs.diastolicBP
    // weight.innerHTML = obs.weight
    // height.innerHTML = obs.height
    painIncrease.innerHTML = obs.painIncrease
    painChange.innerHTML = obs.painChange
    s_bpChange.innerHTML = obs.bpChange[0]
    d_bpChange.innerHTML = obs.bpChange[1]
    hasCorrelation.innerHTML = obs.hasCorrelation
  }

  client.request("Observation?" + query, {
    pageLimit: 0,
    flat: true
  }).then((ob) => {
    let dispVal = {};

    // group all of the observation resources by type into their own
    const byCodes = client.byCodes(ob, 'code');

    //Blood Pressure
    let _systolicBP = getBloodPressureValue(byCodes('55284-4'), '8480-6') // 130 over 80 is high
    let _diastolicBP = getBloodPressureValue(byCodes('55284-4'), '8462-4')// 130 over 80 is high
    const bpValue = (bp)=> Number(parseFloat(bp.valueQuantity.value)).toFixed(4)
    const bpChange = (bp_array) => (bpValue(bp_array[0]) - bpValue(bp_array[1])).toFixed(4)
    const bloodPressureToString = (bp) => !bp ? "" : (bp.valueQuantity.value > 129 ? bp.code.text + "is high: " + bpValue(bp): bp.code.text+ " " + bpValue(bp))
    dispVal.systolicBP = bloodPressureToString(_systolicBP[0])
    dispVal.diastolicBP = bloodPressureToString(_diastolicBP[0])
    dispVal.bpChange = [`Systolic change: ${bpChange(_systolicBP)} `, ` Diastolic change: ${bpChange(_diastolicBP)}`]

    //Pain
    dispVal.thisPain = getQuantityValueAndUnit(byCodes("72514-3")[0])
    dispVal.lastPain = getQuantityValueAndUnit(byCodes("72514-3")[1])
    let painDiff = (dispVal.thisPain - dispVal.lastPain).toFixed(4);
    dispVal.painIncrease = painDiff > 0 ? "Warning patient's pain has increased by" : "patient pain has decreased by"
    dispVal.painChange = painDiff

    let increasingTogether = (bpChange(_systolicBP) > 0 || bpChange(_diastolicBP) > 0 && painDiff > 0)
    let decreasingTogether = (bpChange(_systolicBP) < 0 || bpChange(_diastolicBP) < 0 && painDiff < 0)// if both change values are going up or down together


    dispVal.hasCorrelation = increasingTogether ? "A correlation was found with pain and blood presser both increasing": (decreasingTogether ? "A correlation was found with pain and blood presser both decreasing together": "No correlation was found between pain and blood presser")// if both change values are going up or down together

    displayObservation(dispVal)
  });


// display the patient name gender and dob in the index page
  function displayPatient(pt) {
    document.getElementById('patient_name').innerHTML = getPatientName(pt);
    document.getElementById('gender').innerHTML = pt.gender;
    document.getElementById('dob').innerHTML = pt.birthDate;
  }


// get patient object and then display its demographics info in the banner
  client.request(`Patient/${client.patient.id}`).then(
      function (patient) {
        displayPatient(patient);
        console.log(patient);
      }
  );


  //document.getElementById('add').addEventListener('click', addWeightAnnotation);


}).catch(console.error);
