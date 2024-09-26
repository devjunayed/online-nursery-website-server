export default function sendResponse(success, message, data, length){


    let responseMessage = message

    if(!data){
        data = {};
        responseMessage = message || "No data available"
        success = false
    }

    if(data.length === 0){
        data = [];
        responseMessage = message || "No data available"
        success = false
    }

    return {
        success,
        message: responseMessage,
        data,
        length: length !== undefined ? length : null
    }
}