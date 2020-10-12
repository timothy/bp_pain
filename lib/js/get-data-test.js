//adapted from the cerner smart on fhir guide. updated to utilize client.js v2 library and FHIR R4
//import {FHIR} from './fhir-client.js';

//Global
let _GLOBAL_weight;

//create a fhir client based on the sandbox environment and test patient.
const client = new FHIR.client({
    serverUrl: "https://r4.smarthealthit.org",
    tokenResponse: {
        patient: "14867dba-fb11-4df3-9829-8e8e081b39e6"
    }
});

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
    displayObservation(dispVal)
});


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

//helper function to display the annotation on the index page
function displayAnnotation(annotation) {
    note.innerHTML = annotation;
}

// get patient object and then display its demographics info in the banner
client.request(`Patient/${client.patient.id}`).then(
    function (patient) {
        displayPatient(patient);
        console.log(patient);
    }
);

client.request("MedicationRequest?patient=" + client.patient.id, {
    pageLimit: 0,
    flat: true
}).then(
    function (mr) {
        for (let m of mr) {//Display medication list
            displayMedication(m.medicationCodeableConcept.text);
        }
    });

//event listener when the add button is clicked to call the function that will add the note to the weight observation
document.getElementById('add').addEventListener('click', addWeightAnnotation);
