export const errorSettings = {
    401: [{
        errorCode: "CREDENTIALS_INVALID",
        errorText: {
            ru: "Неверный логин или пароль",
            en: "Login or password is invalid"
        }
    },
    {
        errorCode: "TWOFA_CODE_REQUIRED",
        errorText: {
            ru: "Введите 2FA код",
            en: "2FA code is required"
        }
    },
    {
        errorCode: "VERIFICATION_CODE_INVALID",
        errorText: {
            ru: "Неверный 2FA код",
            en: "2FA code is invalid"
        }
    },
    {
        errorCode: "IDENTITY_TYPE_REQUIRED",
        errorText: {
            ru: "Неверно введенные данные",
            en: "Data is invalid"
        }
    },
    {
        errorCode: "STATE_REQUIRED",
        errorText: {
            ru: "Сессия истекла, повторите попытку входа",
            en: "Session expired, please try to login again"
        }
    }
]
}