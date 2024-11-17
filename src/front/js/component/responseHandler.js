import { message } from 'antd';

const defaultSuccessCallback = () => {
    message.success('成功');
}
const defaultErrorCallback = (error_code, error_message) => {
    message.error(`请求失败：${error_message}`);
}
export const responseHandler = (response, successCallback = defaultSuccessCallback, errorCallbak = defaultErrorCallback) => {
    console.log(`responseHandler response=${JSON.stringify(response)}`)
    if (response.success == true) {
        successCallback(response.result);
    } else {
        errorCallbak(response.error_code, response.error_message)
    }
}