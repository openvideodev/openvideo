import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { APP_GUARD } from "@nestjs/core";
import { JwtStrategy } from "./jwt.strategy";
import { AuthController } from "./auth.controller";
import { ApiTokenService } from "./api-token.service";
import { JwtGuard } from "./jwt.guard";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "7d" },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    JwtGuard,
    ApiTokenService,
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
  ],
  exports: [JwtModule, ApiTokenService, JwtGuard],
})
export class AuthModule {}
