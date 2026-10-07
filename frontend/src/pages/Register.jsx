import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import shape1 from '../assets/images/shape1.svg';
import darkShape from '../assets/images/dark_shape.svg';
import shape2 from '../assets/images/shape2.svg';
import darkShape1 from '../assets/images/dark_shape1.svg';
import shape3 from '../assets/images/shape3.svg';
import darkShape2 from '../assets/images/dark_shape2.svg';
import registrationImg from '../assets/images/registration.png';
import registrationImgDark from '../assets/images/registration1.png';
import logo from '../assets/images/logo.svg';
import googleIcon from '../assets/images/google.svg';

const Register = () => {
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', repeatPassword: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.repeatPassword) {
            return setError('Please fill in all fields');
        }

        if (formData.password.length < 8) {
            return setError('Password must be at least 8 characters');
        }

        if (!/\d/.test(formData.password)) {
            return setError('Password must contain at least one number');
        }

        if (formData.password !== formData.repeatPassword) {
            return setError('Passwords do not match');
        }

        setIsLoading(true);
        try {
            await register({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password
            });
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="_social_registration_wrapper _layout_main_wrapper">
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
            <div className="_social_registration_wrap">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
                            <div className="_social_registration_right">
                                <div className="_social_registration_right_image">
                                    <img src={registrationImg} alt="Image" />
                                </div>
                                <div className="_social_registration_right_image_dark">
                                    <img src={registrationImgDark} alt="Image" />
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
                            <div className="_social_registration_content">
                                <div className="_social_registration_right_logo _mar_b28">
                                    <img src={logo} alt="Image" className="_right_logo" />
                                </div>
                                <p className="_social_registration_content_para _mar_b8">Get Started Now</p>
                                <h4 className="_social_registration_content_title _titl4 _mar_b50">Registration</h4>
                                
                                {error && <div className="alert alert-danger">{error}</div>}

                                <button type="button" className="_social_registration_content_btn _mar_b40">
                                    <img src={googleIcon} alt="Image" className="_google_img" /> <span>Register with google</span>
                                </button>
                                <div className="_social_registration_content_bottom_txt _mar_b40"> <span>Or</span>
                                </div>
                                <form className="_social_registration_form" onSubmit={handleSubmit}>
                                    <div className="row">
                                        <div className="col-xl-6 col-lg-6 col-md-6 col-sm-12">
                                            <div className="_social_registration_form_input _mar_b14">
                                                <label className="_social_registration_label _mar_b8">First Name</label>
                                                <input name="firstName" type="text" className="form-control _social_registration_input" placeholder="First Name" onChange={handleChange} required />
                                            </div>
                                        </div>
                                        <div className="col-xl-6 col-lg-6 col-md-6 col-sm-12">
                                            <div className="_social_registration_form_input _mar_b14">
                                                <label className="_social_registration_label _mar_b8">Last Name</label>
                                                <input name="lastName" type="text" className="form-control _social_registration_input" placeholder="Last Name" onChange={handleChange} required />
                                            </div>
                                        </div>
                                        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                                            <div className="_social_registration_form_input _mar_b14">
                                                <label className="_social_registration_label _mar_b8">Email</label>
                                                <input name="email" type="email" className="form-control _social_registration_input" placeholder="Email" onChange={handleChange} required />
                                            </div>
                                        </div>
                                        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                                            <div className="_social_registration_form_input _mar_b14">
                                                <label className="_social_registration_label _mar_b8">Password</label>
                                                <input name="password" type="password" className="form-control _social_registration_input" placeholder="Password" onChange={handleChange} required />
                                            </div>
                                        </div>
                                        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                                            <div className="_social_registration_form_input _mar_b14">
                                                <label className="_social_registration_label _mar_b8">Repeat Password</label>
                                                <input name="repeatPassword" type="password" className="form-control _social_registration_input" placeholder="Repeat Password" onChange={handleChange} required />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-lg-12 col-xl-12 col-md-12 col-sm-12">
                                            <div className="form-check _social_registration_form_check">
                                                <input className="form-check-input _social_registration_form_check_input" type="radio" name="flexRadioDefault" id="flexRadioDefault2" defaultChecked />
                                                <label className="form-check-label _social_registration_form_check_label" htmlFor="flexRadioDefault2">I agree to terms & conditions</label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                                            <div className="_social_registration_form_btn _mar_t40 _mar_b60">
                                                <button type="submit" className="_social_registration_form_btn_link _btn1" disabled={isLoading} style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s' }}>
                                                    {isLoading ? 'Registering…' : 'Register'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                                <div className="row">
                                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                                        <div className="_social_registration_bottom_txt">
                                            <p className="_social_registration_bottom_txt_para">Already have an account? <Link to="/login">Login to Account</Link>
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

export default Register;
