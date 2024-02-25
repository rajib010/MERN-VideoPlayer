// const asyncHandler = (fun) => {
//    return async (err, req, res, next) => {
//         try {
//             await fun(req, res, next)
//         } catch (error) {
//             res.status(error.code || 500).json({
//                 success: false,
//                 message: error.message
//             })
//         }
//     }
// }

// using promises

const asyncHandler = (reqHandler) => {
    return (req, res, next) => {
        Promise.resolve(reqHandler(req, res, next))
            .catch((err) => next(err))
    }
}


export { asyncHandler }