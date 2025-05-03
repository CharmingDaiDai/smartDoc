package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.dto.AuthenticationRequest;
import com.mtmn.smartdoc.vo.AuthenticationResponse;
import com.mtmn.smartdoc.vo.RegisterRequest;


/**
 * @author charmingdaidai
 */
public interface AuthenticationService {

    public AuthenticationResponse register(RegisterRequest request);

    public AuthenticationResponse authenticate(AuthenticationRequest request);

    String createGithubAuthorizationUrl();

    AuthenticationResponse authenticateWithGithub(String code, String state);

    /**
     * 刷新令牌
     *
     * @param refreshToken 刷新令牌
     * @return 新的认证响应，包含新的访问令牌和刷新令牌
     */
//    public AuthenticationResponse refreshToken(String refreshToken);
}