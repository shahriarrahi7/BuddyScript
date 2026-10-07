import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import shape1 from '../assets/images/shape1.svg';
import darkShape from '../assets/images/dark_shape.svg';
import shape2 from '../assets/images/shape2.svg';
import darkShape1 from '../assets/images/dark_shape1.svg';
import shape3 from '../assets/images/shape3.svg';
import darkShape2 from '../assets/images/dark_shape2.svg';
import loginImg from '../assets/images/login.png';
import logo from '../assets/images/logo.svg';
import googleIcon from '../assets/images/google.svg';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError(''); // Clear error when user starts typing
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.email || !formData.password) {
            return setError('Please fill in all fields');
        }

        setIsLoading(true);
        try {
            await login(formData.email, formData.password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="_social_login_wrapper _layout_main_wrapper">
            <div className="_shape_one">
                <img src={shape1} alt="" className="_shape_img" />
                <img src={darkShape} alt="" className="_dark_shape" />
            </div>
            <div className="_shape_two">
                <img src={shape2} alt="" className="_shape_img" />
                <img src={darkShape1} alt="" className="_dark_shape _dark_shape_opacity" />
            </div>
            <div className="_shape_three">
                <img src={shape3} alt="" className="_shape_img" />
                <img src={darkShape2} alt="" className="_dark_shape _dark_shape_opacity" />
            </div>
            <div className="_social_login_wrap">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
                            <div className="_social_login_left">
                                <div className="_social_login_left_image">
                                    <img src={loginImg} alt="Image" className="_left_img" />
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
                            <div className="_social_login_content">
                                <div className="_social_login_left_logo _mar_b28">
                                    <img src={logo} alt="Image" className="_left_logo" />
                                </div>
                                <p className="_social_login_content_para _mar_b8">Welcome back</p>
                                <h4 className="_social_login_content_title _titl4 _mar_b50">Login to your account</h4>
                                
                                {error && <div className="alert alert-danger">{error}</div>}

                                <button type="button" className="_social_login_content_btn _mar_b40">
                                    <img src={googleIcon} alt="Image" className="_google_img" /> <span>Or sign-in with google</span>
                                </button>
                                <div className="_social_login_content_bottom_txt _mar_b40"> <span>Or</span>
                                </div>
                                <form className="_social_login_form" onSubmit={handleSubmit}>
                                    <div className="row">
                                        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                                            <div className="_social_login_form_input _mar_b14">
                                                <label className="_social_login_label _mar_b8">Email</label>
                                                <input name="email" type="email" className="form-control _social_login_input" placeholder="Email" onChange={handleChange} required />
                                            </div>
                                        </div>
                                        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                                            <div className="_social_login_form_input _mar_b14">
                                                <label className="_social_login_label _mar_b8">Password</label>
                                                <input name="password" type="password" className="form-control _social_login_input" placeholder="Password" onChange={handleChange} required />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                                            <div className="form-check _social_login_form_check">
                                                <input className="form-check-input _social_login_form_check_input" type="radio" name="flexRadioDefault" id="flexRadioDefault2" defaultChecked />
                                                <label className="form-check-label _social_login_form_check_label" htmlFor="flexRadioDefault2">Remember me</label>
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                                            <div className="_social_login_form_left">
                                                <p className="_social_login_form_left_para">Forgot password?</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                                            <div className="_social_login_form_btn _mar_t40 _mar_b60">
                                                <button type="submit" className="_social_login_form_btn_link _btn1" disabled={isLoading} style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s' }}>
                                                    {isLoading ? 'Logging in…' : 'Login now'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                                <div className="row">
                                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                                        <div className="_social_login_bottom_txt">
                                            <p className="_social_login_bottom_txt_para">Dont have an account? <Link to="/register">Create New Account</Link>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Login;
