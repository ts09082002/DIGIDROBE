"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const serve_static_1 = require("@nestjs/serve-static");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const path_1 = require("path");
const upload_module_1 = require("./upload/upload.module");
const wardrobe_module_1 = require("./wardrobe/wardrobe.module");
const calendar_module_1 = require("./calendar/calendar.module");
const packing_module_1 = require("./packing/packing.module");
const sync_module_1 = require("./sync/sync.module");
const firebase_auth_middleware_1 = require("./middleware/firebase-auth.middleware");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(firebase_auth_middleware_1.FirebaseAuthMiddleware)
            .exclude({ path: 'uploads/(.*)', method: common_1.RequestMethod.GET })
            .forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            throttler_1.ThrottlerModule.forRoot([{
                    ttl: 60000,
                    limit: 100,
                }]),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'uploads'),
                serveRoot: '/uploads',
            }),
            upload_module_1.UploadModule,
            wardrobe_module_1.WardrobeModule,
            calendar_module_1.CalendarModule,
            packing_module_1.PackingModule,
            sync_module_1.SyncModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map