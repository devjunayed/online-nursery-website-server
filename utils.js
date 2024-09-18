export default function sendResponse(success, message, data){

    if(!data){
        data = {};
        message = "No data available"
        success = false
    }

    if(data.length === 0){
        data = [];
        message = "No data available"
        success = false
    }

    return {
        success,
        message,
        data
    }
}